# backend/services/pdf_service.py
"""
PDF statement generation.
generate_statement_pdf is a pure transformation — no DB, no HTTP.
Mirrors settlement_service.py: takes plain dicts, returns bytes.
"""

import hashlib
from datetime import datetime
from weasyprint import HTML


TYPE_META = {
    "personal_expense":    {"color": "#fbbf24", "label": "Personal"},
    "group_expense":       {"color": "#60a5fa", "label": "Group expense"},
    "group_expense_owed":  {"color": "#f87171", "label": "You owe"},
    "income":              {"color": "#34d399", "label": "Income"},
    "loan_given":          {"color": "#818cf8", "label": "Loan given"},
    "loan_taken":          {"color": "#f472b6", "label": "Loan taken"},
    "settlement_received": {"color": "#34d399", "label": "Received"},
    "settlement_sent":     {"color": "#60a5fa", "label": "Sent"},
}

INFLOW_TYPES = {"income", "settlement_received", "loan_taken"}


def _fmt_amount(n) -> str:
    return f"{float(n or 0):,.2f}"


def _row_html(event: dict, zebra: bool = False) -> str:
    meta = TYPE_META.get(event["type"], {"color": "#9095a8", "label": event["type"]})
    inflow = event["type"] in INFLOW_TYPES
    sign = "+" if inflow else "-"
    amount_color = "#10b981" if inflow else "#1a1a1a"
    row_bg = "background:#f8f9fb;" if zebra else ""

    sub_line = event.get("sub") or ""
    group_line = f' · {event["group_name"]}' if event.get("group_name") else ""

    return f"""
    <tr style="{row_bg}">
        <td class="col-date">{event.get('date', '')}</td>
        <td class="col-desc">
            <div class="label">{event.get('label', '')}</div>
            <div class="sub">{sub_line}{group_line}</div>
        </td>
        <td class="col-tag">
            <span class="tag" style="background:{meta['color']}22;color:{meta['color']};">
                {meta['label']}
            </span>
        </td>
        <td class="col-amt" style="color:{amount_color};">
            {sign}&#8377;{_fmt_amount(event.get('amount'))}
        </td>
    </tr>
    """


def _statement_id(user_email: str, events: list[dict], generated_at_iso: str) -> str:
    """
    Deterministic-looking reference number for this statement — not a
    cryptographic signature, just a visual authenticity cue like bank
    statements use. Same inputs always produce the same ID.
    """
    seed = f"{user_email}|{len(events)}|{generated_at_iso}"
    digest = hashlib.sha256(seed.encode()).hexdigest()[:10].upper()
    date_part = datetime.now().strftime("%Y%m%d")
    return f"STMT-{date_part}-{digest}"


def generate_statement_pdf(
    user_name: str, user_email: str, events: list[dict], period_label: str = "All time",
) -> bytes:
    """
    Renders a chronological timeline statement as a PDF and returns raw bytes.
    `events` is the exact list returned by a timeline_repository fetch function.
    """
    now = datetime.now()
    generated_at = now.strftime("%d %B %Y, %I:%M %p")
    stmt_id = _statement_id(user_email, events, now.isoformat())

    total_in = sum(
        float(e.get("amount") or 0) for e in events if e["type"] in INFLOW_TYPES
    )
    total_out = sum(
        float(e.get("amount") or 0) for e in events if e["type"] not in INFLOW_TYPES
    )

    rows_html = "".join(
        _row_html(e, zebra=(i % 2 == 1)) for i, e in enumerate(events)
    ) or (
        '<tr><td colspan="4" class="empty">No activity in this period.</td></tr>'
    )

    net = total_in - total_out
    net_color = "#10b981" if net >= 0 else "#ef4444"
    net_sign = "+" if net >= 0 else ""

    html = f"""
    <html>
    <head>
    <meta charset="utf-8">
    <style>
        @page {{
            size: A4;
            margin: 30px 32px 40px 32px;
            @bottom-left {{
                content: "SplitEase — Confidential Statement · {stmt_id}";
                font-size: 7.5px;
                color: #9095a8;
            }}
            @bottom-right {{
                content: "Page " counter(page) " of " counter(pages);
                font-size: 7.5px;
                color: #9095a8;
            }}
        }}
        * {{ box-sizing: border-box; }}
        body {{
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #1a1a1a;
            font-size: 10px;
        }}
        .header-band {{
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            border-radius: 10px;
            padding: 16px 20px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .brand-row {{ display: flex; align-items: center; gap: 10px; }}
        .brand-mark {{
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: rgba(255,255,255,0.2);
            color: #fff;
            font-size: 16px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        .brand {{ font-size: 17px; font-weight: 800; color: #fff; }}
        .brand-sub {{ font-size: 8px; color: rgba(255,255,255,0.75); margin-top: 1px; letter-spacing: 0.3px; text-transform: uppercase; }}
        .header-right {{ text-align: right; }}
        .stmt-id {{
            font-size: 9px;
            color: #fff;
            font-weight: 700;
            letter-spacing: 0.4px;
            background: rgba(255,255,255,0.15);
            padding: 3px 9px;
            border-radius: 999px;
            display: inline-block;
        }}

        .meta-row {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
        }}
        .meta-block {{ font-size: 9px; color: #6b7280; line-height: 1.7; }}
        .meta-block strong {{ color: #1a1a1a; font-size: 10.5px; }}
        .meta-label {{
            font-size: 7.5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #9ca3af;
        }}

        .summary {{
            display: flex;
            gap: 10px;
            margin-bottom: 18px;
        }}
        .summary-card {{
            flex: 1;
            border: 1px solid #e5e7eb;
            border-left: 3px solid #2563eb;
            border-radius: 8px;
            padding: 10px 14px;
            background: #fafbfc;
        }}
        .net-card {{
            border-left: 3px solid {net_color};
            background: {net_color}0d;
        }}
        .summary-label {{ font-size: 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }}
        .summary-value {{ font-size: 15px; font-weight: 700; margin-top: 3px; }}
        .in {{ color: #10b981; }}
        .out {{ color: #ef4444; }}

        table {{ width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }}
        thead th {{
            text-align: left;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #fff;
            background: #1a1a1a;
            padding: 8px;
        }}
        tbody td {{
            padding: 9px 8px;
            border-bottom: 1px solid #f1f2f4;
            vertical-align: top;
        }}
        tfoot td {{
            padding: 10px 8px;
            font-weight: 700;
            border-top: 2px solid #1a1a1a;
            background: #f8f9fb;
        }}
        .col-date {{ width: 70px; color: #6b7280; font-size: 9px; }}
        .col-desc {{ width: auto; }}
        .col-tag {{ width: 100px; }}
        .col-amt {{ width: 90px; text-align: right; font-weight: 700; }}
        .label {{ font-weight: 600; font-size: 10px; }}
        .sub {{ font-size: 8.5px; color: #9095a8; margin-top: 2px; }}
        .tag {{
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 8px;
            font-weight: 600;
        }}
        .empty {{ text-align: center; color: #9095a8; padding: 30px 0; }}
        .footer-note {{
            margin-top: 16px;
            font-size: 7.5px;
            color: #9ca3af;
            text-align: center;
            line-height: 1.6;
        }}
    </style>
    </head>
    <body>
        <div class="header-band">
            <div class="brand-row">
                <div class="brand-mark">S</div>
                <div>
                    <div class="brand">SplitEase</div>
                    <div class="brand-sub">Financial Activity Statement</div>
                </div>
            </div>
            <div class="header-right">
                <div class="stmt-id">{stmt_id}</div>
            </div>
        </div>

        <div class="meta-row">
            <div class="meta-block">
                <div class="meta-label">Account Holder</div>
                <div><strong>{user_name}</strong></div>
                <div>{user_email}</div>
            </div>
            <div class="meta-block" style="text-align:right;">
                <div class="meta-label">Statement Period</div>
                <div><strong>{period_label}</strong></div>
                <div>Generated {generated_at}</div>
            </div>
        </div>

        <div class="summary">
            <div class="summary-card">
                <div class="summary-label">Total Inflow</div>
                <div class="summary-value in">+&#8377;{_fmt_amount(total_in)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Outflow</div>
                <div class="summary-value out">-&#8377;{_fmt_amount(total_out)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Entries</div>
                <div class="summary-value">{len(events)}</div>
            </div>
            <div class="summary-card net-card">
                <div class="summary-label">Net</div>
                <div class="summary-value" style="color:{net_color};">{net_sign}&#8377;{_fmt_amount(abs(net))}</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th style="text-align:right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3">Net for this period</td>
                    <td class="col-amt" style="color:{net_color};">{net_sign}&#8377;{_fmt_amount(abs(net))}</td>
                </tr>
            </tfoot>
        </table>

        <div class="footer-note">
            This is a system-generated statement from SplitEase and does not require a physical signature.<br/>
            Reference ID {stmt_id} · Generated on {generated_at}
        </div>
    </body>
    </html>
    """

    return HTML(string=html).write_pdf()