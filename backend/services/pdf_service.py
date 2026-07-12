# backend/services/pdf_service.py
"""
PDF statement generation.
generate_statement_pdf is a pure transformation — no DB, no HTTP.
"""

import base64
import hashlib
import os
from datetime import datetime
from weasyprint import HTML

_LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "splitease-logo.png")

_logo_b64_cache = None


def _get_logo_data_uri() -> str:
    global _logo_b64_cache
    if _logo_b64_cache is None:
        try:
            with open(_LOGO_PATH, "rb") as f:
                _logo_b64_cache = base64.b64encode(f.read()).decode("ascii")
        except FileNotFoundError:
            _logo_b64_cache = ""
    return f"data:image/png;base64,{_logo_b64_cache}" if _logo_b64_cache else ""


TYPE_META = {
    "personal_expense":    {"color": "#f59e0b", "label": "Personal"},
    "group_expense":       {"color": "#2563eb", "label": "Group expense"},
    "group_expense_owed":  {"color": "#ef4444", "label": "You owe"},
    "income":              {"color": "#10b981", "label": "Income"},
    "loan_given":          {"color": "#6366f1", "label": "Loan given"},
    "loan_taken":          {"color": "#ec4899", "label": "Loan taken"},
    "settlement_received": {"color": "#10b981", "label": "Received"},
    "settlement_sent":     {"color": "#2563eb", "label": "Sent"},
}

INFLOW_TYPES = {"income", "settlement_received", "loan_taken"}


def _fmt_amount(n) -> str:
    return f"{float(n or 0):,.2f}"


def _statement_id(user_email: str, events: list[dict], generated_at_iso: str) -> str:
    seed = f"{user_email}|{len(events)}|{generated_at_iso}"
    digest = hashlib.sha256(seed.encode()).hexdigest()[:10].upper()
    date_part = datetime.now().strftime("%Y%m%d")
    return f"STMT-{date_part}-{digest}"


def _row_html(event: dict, zebra: bool = False) -> str:
    meta = TYPE_META.get(event["type"], {"color": "#9ca3af", "label": event["type"]})
    inflow = event["type"] in INFLOW_TYPES
    sign = "+" if inflow else "-"
    amount_color = "#10b981" if inflow else "#111827"
    row_bg = "background:#fafbfc;" if zebra else "background:#ffffff;"

    sub_line = event.get("sub") or ""
    group_line = f' &middot; {event["group_name"]}' if event.get("group_name") else ""
    sub_full = f"{sub_line}{group_line}".strip()

    return f"""
    <tr style="{row_bg}">
        <td class="col-accent" style="background:{meta['color']};"></td>
        <td class="col-date">{event.get('date', '')}</td>
        <td class="col-desc">
            <div class="label">{event.get('label', '')}</div>
            {f'<div class="sub">{sub_full}</div>' if sub_full else ''}
        </td>
        <td class="col-tag">
            <span class="tag" style="background:{meta['color']}18;color:{meta['color']};border:1px solid {meta['color']}40;">
                {meta['label']}
            </span>
        </td>
        <td class="col-amt" style="color:{amount_color};">
            {sign}&#8377;{_fmt_amount(event.get('amount'))}
        </td>
    </tr>
    """


def generate_statement_pdf(
    user_name: str, user_email: str, events: list[dict], period_label: str = "All time",
) -> bytes:
    now = datetime.now()
    generated_at = now.strftime("%d %B %Y, %I:%M %p")
    stmt_id = _statement_id(user_email, events, now.isoformat())
    logo_uri = _get_logo_data_uri()

    total_in = sum(float(e.get("amount") or 0) for e in events if e["type"] in INFLOW_TYPES)
    total_out = sum(float(e.get("amount") or 0) for e in events if e["type"] not in INFLOW_TYPES)
    net = total_in - total_out
    net_color = "#10b981" if net >= 0 else "#ef4444"
    net_sign = "+" if net >= 0 else ""

    rows_html = "".join(
        _row_html(e, zebra=(i % 2 == 1)) for i, e in enumerate(events)
    ) or '<tr><td colspan="5" class="empty">No activity in this period.</td></tr>'

    logo_img = (
        f'<img src="{logo_uri}" class="logo-img" />' if logo_uri
        else '<div class="logo-fallback">S</div>'
    )

    html = f"""
    <html>
    <head>
    <meta charset="utf-8">
    <style>
        @page {{
            size: A4;
            margin: 0 0 44px 0;
            @bottom-center {{
                content: "";
            }}
        }}
        * {{ box-sizing: border-box; }}
        body {{
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #111827;
            font-size: 10px;
            margin: 0;
        }}
        .page-pad {{ padding: 0 32px; }}

        .header-band {{
            background: linear-gradient(120deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%);
            padding: 26px 32px 22px 32px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }}
        .brand-row {{ display: flex; align-items: center; gap: 12px; }}
        .logo-img {{ width: 40px; height: 40px; border-radius: 10px; background: #fff; padding: 4px; }}
        .logo-fallback {{
            width: 40px; height: 40px; border-radius: 10px;
            background: rgba(255,255,255,0.2); color: #fff;
            font-size: 18px; font-weight: 800;
            display: flex; align-items: center; justify-content: center;
        }}
        .brand {{ font-size: 19px; font-weight: 800; color: #fff; letter-spacing: -0.3px; }}
        .brand-sub {{ font-size: 8.5px; color: rgba(255,255,255,0.8); margin-top: 2px; letter-spacing: 0.4px; text-transform: uppercase; }}
        .stmt-id {{
            font-size: 8.5px; color: #fff; font-weight: 700; letter-spacing: 0.3px;
            background: rgba(255,255,255,0.18);
            padding: 4px 10px; border-radius: 999px;
        }}

        .account-strip {{
            background: #f3f4f6;
            padding: 12px 32px;
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #e5e7eb;
        }}
        .acc-block {{ font-size: 9px; color: #6b7280; line-height: 1.6; }}
        .acc-block strong {{ color: #111827; font-size: 11px; }}
        .acc-label {{ font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; }}

        .summary {{ display: flex; gap: 10px; padding: 16px 32px 4px 32px; }}
        .summary-card {{
            flex: 1; border: 1px solid #e5e7eb; border-radius: 8px;
            padding: 10px 14px; background: #fafbfc;
        }}
        .summary-card.in {{ border-top: 3px solid #10b981; }}
        .summary-card.out {{ border-top: 3px solid #ef4444; }}
        .summary-card.entries {{ border-top: 3px solid #2563eb; }}
        .summary-card.net {{ border-top: 3px solid {net_color}; }}
        .summary-label {{ font-size: 7.5px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }}
        .summary-value {{ font-size: 14px; font-weight: 800; margin-top: 3px; }}

        table {{ width: 100%; border-collapse: collapse; margin-top: 14px; }}
        thead th {{
            text-align: left; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px;
            color: #fff; background: #111827; padding: 8px 10px;
        }}
        thead th:first-child {{ width: 4px; padding: 0; }}
        tbody td {{ padding: 10px; border-bottom: 1px solid #f1f2f4; vertical-align: top; }}
        .col-accent {{ width: 4px; padding: 0 !important; }}
        .col-date {{ width: 66px; color: #6b7280; font-size: 8.5px; font-weight: 600; }}
        .col-desc {{ width: auto; }}
        .col-tag {{ width: 96px; }}
        .col-amt {{ width: 86px; text-align: right; font-weight: 800; }}
        .label {{ font-weight: 700; font-size: 10px; color: #111827; }}
        .sub {{ font-size: 8.2px; color: #9ca3af; margin-top: 2px; }}
        .tag {{ display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 7.5px; font-weight: 700; }}
        .empty {{ text-align: center; color: #9ca3af; padding: 30px 0; }}

        tfoot td {{
            padding: 12px 10px; font-weight: 800; border-top: 2px solid #111827;
            background: #f8f9fb; font-size: 10.5px;
        }}

        .disclaimer {{
            margin: 18px 32px 0 32px; font-size: 7.5px; color: #9ca3af; line-height: 1.7;
            border-top: 1px solid #e5e7eb; padding-top: 12px;
        }}
        .bottom-bar {{
            margin-top: 20px; background: #111827; color: #fff;
            text-align: center; padding: 8px; font-size: 8px; letter-spacing: 0.5px;
        }}
    </style>
    </head>
    <body>
        <div class="header-band">
            <div class="brand-row">
                {logo_img}
                <div>
                    <div class="brand">SplitEase</div>
                    <div class="brand-sub">Financial Activity Statement</div>
                </div>
            </div>
            <div class="stmt-id">{stmt_id}</div>
        </div>

        <div class="account-strip">
            <div class="acc-block">
                <div class="acc-label">Account Holder</div>
                <div><strong>{user_name}</strong></div>
                <div>{user_email}</div>
            </div>
            <div class="acc-block" style="text-align:right;">
                <div class="acc-label">Statement Period</div>
                <div><strong>{period_label}</strong></div>
                <div>Generated {generated_at}</div>
            </div>
        </div>

        <div class="page-pad">
            <div class="summary">
                <div class="summary-card in">
                    <div class="summary-label">Total Inflow</div>
                    <div class="summary-value" style="color:#10b981;">+&#8377;{_fmt_amount(total_in)}</div>
                </div>
                <div class="summary-card out">
                    <div class="summary-label">Total Outflow</div>
                    <div class="summary-value" style="color:#ef4444;">-&#8377;{_fmt_amount(total_out)}</div>
                </div>
                <div class="summary-card entries">
                    <div class="summary-label">Entries</div>
                    <div class="summary-value">{len(events)}</div>
                </div>
                <div class="summary-card net">
                    <div class="summary-label">Net</div>
                    <div class="summary-value" style="color:{net_color};">{net_sign}&#8377;{_fmt_amount(abs(net))}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th></th>
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
                        <td colspan="4">Net for this period</td>
                        <td class="col-amt" style="color:{net_color};">{net_sign}&#8377;{_fmt_amount(abs(net))}</td>
                    </tr>
                </tfoot>
            </table>

            <div class="disclaimer">
                This is a system-generated statement from SplitEase and does not require a physical signature.<br/>
                Reference ID {stmt_id} &middot; Generated on {generated_at}<br/>
                For queries regarding this statement, please contact support through the SplitEase app.
            </div>
        </div>

        <div class="bottom-bar">SPLITEASE &middot; CONFIDENTIAL STATEMENT &middot; {stmt_id}</div>
    </body>
    </html>
    """

    return HTML(string=html).write_pdf()