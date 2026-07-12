# backend/services/pdf_service.py
"""
PDF statement generation.
generate_statement_pdf is a pure transformation — no DB, no HTTP.
Mirrors settlement_service.py: takes plain dicts, returns bytes.
"""

from datetime import datetime
from weasyprint import HTML

# Matches ActivityScreen.jsx TYPE_META colors exactly, for visual consistency
# across mobile / web / PDF.
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


def _row_html(event: dict) -> str:
    meta = TYPE_META.get(event["type"], {"color": "#9095a8", "label": event["type"]})
    inflow = event["type"] in INFLOW_TYPES
    sign = "+" if inflow else "-"
    amount_color = "#10b981" if inflow else "#1a1a1a"

    sub_line = event.get("sub") or ""
    group_line = f' · {event["group_name"]}' if event.get("group_name") else ""

    return f"""
    <tr>
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


def generate_statement_pdf(
    user_name: str, user_email: str, events: list[dict], period_label: str = "All time",
) -> bytes:
    """
    Renders a chronological timeline statement as a PDF and returns raw bytes.
    `events` is the exact list returned by a timeline_repository fetch function.
    """
    generated_at = datetime.now().strftime("%d %B %Y, %I:%M %p")

    total_in = sum(
        float(e.get("amount") or 0) for e in events if e["type"] in INFLOW_TYPES
    )
    total_out = sum(
        float(e.get("amount") or 0) for e in events if e["type"] not in INFLOW_TYPES
    )

    rows_html = "".join(_row_html(e) for e in events) or (
        '<tr><td colspan="4" class="empty">No activity in this period.</td></tr>'
    )

    html = f"""
    <html>
    <head>
    <meta charset="utf-8">
    <style>
        @page {{
            size: A4;
            margin: 28px 32px;
            @bottom-center {{
                content: "SplitEase — Confidential Statement";
                font-size: 8px;
                color: #9095a8;
            }}
        }}
        * {{ box-sizing: border-box; }}
        body {{
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #1a1a1a;
            font-size: 10px;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 14px;
            margin-bottom: 18px;
        }}
        .brand {{ font-size: 20px; font-weight: 800; color: #2563eb; }}
        .brand-sub {{ font-size: 9px; color: #6b7280; margin-top: 2px; }}
        .meta {{ text-align: right; font-size: 9px; color: #6b7280; line-height: 1.6; }}
        .meta strong {{ color: #1a1a1a; }}

        .summary {{
            display: flex;
            gap: 10px;
            margin-bottom: 18px;
        }}
        .summary-card {{
            flex: 1;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px 14px;
        }}
        .summary-label {{ font-size: 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }}
        .summary-value {{ font-size: 15px; font-weight: 700; margin-top: 3px; }}
        .in {{ color: #10b981; }}
        .out {{ color: #ef4444; }}

        table {{ width: 100%; border-collapse: collapse; }}
        thead th {{
            text-align: left;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
            border-bottom: 1px solid #e5e7eb;
            padding: 6px 8px;
        }}
        tbody td {{
            padding: 8px;
            border-bottom: 1px solid #f1f2f4;
            vertical-align: top;
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
    </style>
    </head>
    <body>
        <div class="header">
            <div>
                <div class="brand">SplitEase</div>
                <div class="brand-sub">Financial Activity Statement</div>
            </div>
            <div class="meta">
                <div><strong>{user_name}</strong></div>
                <div>{user_email}</div>
                <div>Generated {generated_at}</div>
                <div>Period: <strong>{period_label}</strong></div>
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
        </table>
    </body>
    </html>
    """

    return HTML(string=html).write_pdf()