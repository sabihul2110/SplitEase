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


TYPE_LABEL = {
    "personal_expense": "Personal Expense",
    "group_expense": "Group Expense",
    "group_expense_owed": "Group Share",
    "income": "Income",
    "loan_given": "Loan Given",
    "loan_taken": "Loan Taken",
    "settlement_received": "Settlement Received",
    "settlement_sent": "Settlement Sent",
}
INFLOW_TYPES = {"income", "settlement_received", "loan_taken"}


def _fmt(n) -> str:
    return f"{float(n or 0):,.2f}"


def _stmt_id(user_email: str, events: list[dict], iso: str) -> str:
    seed = f"{user_email}|{len(events)}|{iso}"
    digest = hashlib.sha256(seed.encode()).hexdigest()[:10].upper()
    return f"STMT-{datetime.now().strftime('%Y%m%d')}-{digest}"


def _fmt_date(d: str) -> str:
    try:
        return datetime.strptime(d, "%Y-%m-%d").strftime("%d %b %Y")
    except Exception:
        return d


def _row_html(e: dict, is_last: bool, zebra: bool) -> str:
    inflow = e["type"] in INFLOW_TYPES
    sign = "+" if inflow else "\u2212"
    amt_color = "#047857" if inflow else "#111827"
    type_label = TYPE_LABEL.get(e["type"], e.get("type", "").replace("_", " ").title())
    sub = e.get("sub") or ""
    border = "border-bottom: none;" if is_last else ""
    bg = "background: #f8f9fb;" if zebra else "background: #ffffff;"

    return f"""
    <div class="row" style="{border}{bg}">
        <div class="col-date">{_fmt_date(e.get('date',''))}</div>
        <div class="col-desc">
            <div class="tx-title">{e.get('label','')}</div>
            {f'<div class="tx-sub">{sub}</div>' if sub else ''}
        </div>
        <div class="col-type">{type_label}</div>
        <div class="col-amt" style="color:{amt_color};">{sign} &#8377;{_fmt(e.get('amount'))}</div>
    </div>
    """


def generate_statement_pdf(
    user_name: str,
    user_email: str,
    events: list[dict],
    period_label: str = "All time",
    period_type: str = "range",  # "range" | "month"
) -> bytes:
    now = datetime.now()
    generated_at = now.strftime("%d %b %Y, %I:%M %p")
    stmt_id = _stmt_id(user_email, events, now.isoformat())
    logo_uri = _get_logo_data_uri()
    logo_img = f'<img src="{logo_uri}" class="logo"/>' if logo_uri else ""

    period_text = (
        f"{period_label}" if period_type == "month" else f"{period_label}"
    )

    total_in = sum(float(e.get("amount") or 0) for e in events if e["type"] in INFLOW_TYPES)
    total_out = sum(float(e.get("amount") or 0) for e in events if e["type"] not in INFLOW_TYPES)
    net = total_in - total_out

    n = len(events)
    rows = "".join(_row_html(e, i == n - 1, i % 2 == 1) for i, e in enumerate(events)) or \
        '<div class="row" style="border-bottom:none;"><div class="empty">No transactions in this period.</div></div>'

    html = f"""
    <html><head><meta charset="utf-8"><style>
        @page {{
            size: A4;
            margin: 0 0 46px 0;
            @bottom-left {{
                content: "Generated {generated_at}";
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 8px; color: #bdbfc2; padding: 16px 0 0 0.75in;
            }}
            @bottom-center {{
                content: "Powered by SplitEase";
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 8px; color: #bdbfc2; padding-top: 16px;
            }}
            @bottom-right {{
                content: "Page " counter(page) " of " counter(pages);
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 8px; color: #bdbfc2; padding: 16px 0.75in 0 0;
            }}
        }}
        * {{ box-sizing: border-box; }}
        body {{
            font-family: -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, Arial, sans-serif;
            color: #000; margin: 0; font-size: 11px; line-height: 1.4;
        }}
        .page {{ padding: 0.75in; }}

        .header {{
            display: flex; justify-content: space-between; align-items: flex-start;
            margin-bottom: 32px;
        }}
        .brand-row {{ display: flex; align-items: center; gap: 10px; }}
        .logo {{ width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0; object-fit: cover; display: block; }}
        .brand-name {{ font-size: 18px; font-weight: 600; letter-spacing: -0.5px; color: #000; }}
        .brand-name .accent {{ color: #2563eb; }}
        .doc-label {{
            font-size: 10px; font-weight: 500; letter-spacing: 0.15em;
            color: #9ca3af; text-transform: uppercase; padding-top: 4px;
        }}

        .user-block {{ margin-bottom: 32px; }}
        .user-name {{ font-size: 12px; font-weight: 500; margin-bottom: 4px; color: #000; }}
        .user-email {{ font-size: 11px; color: #6b7280; line-height: 1.6; }}

        .period {{
            font-size: 11px; color: #6b7280; margin-bottom: 24px;
            padding: 14px 16px; background: #f8f9fb; border-radius: 8px;
            border: 1px solid #eceef1;
        }}
        .period .label {{ font-weight: 500; color: #000; }}

        .table {{ margin-bottom: 32px; }}
        .thead {{
            display: grid; grid-template-columns: 1.2fr 2fr 1.2fr 0.8fr; gap: 16px;
            padding-bottom: 12px; border-bottom: 1px solid #d1d5db; margin-bottom: 4px;
            font-size: 9.5px; font-weight: 600; letter-spacing: 0.05em;
            color: #6b7280; text-transform: uppercase;
        }}
        .row {{
            display: grid; grid-template-columns: 1.2fr 2fr 1.2fr 0.8fr; gap: 16px;
            padding: 14px 12px; border-bottom: 1px solid #f3f4f6; border-radius: 6px;
        }}
        .col-date {{ font-size: 11px; font-weight: 600; color: #000; }}
        .col-desc {{ }}
        .tx-title {{ font-size: 11px; font-weight: 500; margin-bottom: 3px; color: #000; }}
        .tx-sub {{ font-size: 10px; color: #9ca3af; }}
        .col-type {{ font-size: 10.5px; color: #4b5563; }}
        .col-amt {{ text-align: right; font-size: 11px; font-weight: 500; }}
        .empty {{ text-align: center; color: #9ca3af; padding: 30px 0; grid-column: 1 / -1; }}

        .summary-wrap {{
            display: flex; justify-content: flex-end; margin-bottom: 8px;
            padding-top: 16px; border-top: 2px solid #e5e7eb;
        }}
        .summary {{ width: 260px; }}
        .summary-line {{
            display: flex; justify-content: space-between; font-size: 11px;
            margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;
        }}
        .summary-line .k {{ color: #6b7280; }}
        .summary-line .v {{ font-weight: 500; }}
        .summary-net {{
            display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 600;
        }}
    </style></head>
    <body>
        <div class="page">
            <div class="header">
                <div class="brand-row">{logo_img}<div class="brand-name">Split<span class="accent">Ease</span></div></div>
                <div class="doc-label">Financial Activity Statement</div>
            </div>

            <div class="user-block">
                <div class="user-name">{user_name}</div>
                <div class="user-email">{user_email}</div>
            </div>

            <div class="period"><span class="label">Statement Period:</span> {period_text}</div>

            <div class="table">
                <div class="thead">
                    <div>Date</div>
                    <div>Transaction Details</div>
                    <div>Type</div>
                    <div style="text-align:right;">Amount</div>
                </div>
                {rows}
            </div>

            <div class="summary-wrap">
                <div class="summary">
                    <div class="summary-line"><span class="k">Total Inflow</span><span class="v" style="color:#047857;">+&#8377;{_fmt(total_in)}</span></div>
                    <div class="summary-line"><span class="k">Total Outflow</span><span class="v">&minus;&#8377;{_fmt(total_out)}</span></div>
                    <div class="summary-net"><span>Net Balance</span><span style="color:{'#047857' if net >= 0 else '#dc2626'};">{'+' if net>=0 else '\u2212'}&#8377;{_fmt(abs(net))}</span></div>
                </div>
            </div>
        </div>
    </body></html>
    """
    return HTML(string=html).write_pdf()