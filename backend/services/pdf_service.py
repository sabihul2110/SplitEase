# backend/services/pdf_service.py
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


def _row_html(e: dict, zebra: bool) -> str:
    inflow = e["type"] in INFLOW_TYPES
    sign = "+" if inflow else ""
    amt_color = "#059669" if inflow else "#111827"
    bg = "background:#f3faf6;" if zebra else "background:#ffffff;"
    type_label = TYPE_LABEL.get(e["type"], e.get("type", "").replace("_", " ").title())
    sub = e.get("sub") or ""
    grp = e.get("group_name") or "SplitEase"

    return f"""
    <tr style="{bg}">
        <td class="col-date">{_fmt_date(e.get('date',''))}</td>
        <td class="col-desc">
            <div class="tx-title">{e.get('label','')}</div>
            <div class="tx-sub">Type: {type_label}</div>
            {f'<div class="tx-sub">Note: {sub}</div>' if sub else ''}
        </td>
        <td class="col-account">{grp}</td>
        <td class="col-amt" style="color:{amt_color};">{sign}&#8377;{_fmt(e.get('amount'))}</td>
    </tr>
    """


def generate_statement_pdf(user_name: str, user_email: str, events: list[dict], period_label: str = "All time") -> bytes:
    now = datetime.now()
    generated_at = now.strftime("%d %b %Y, %I:%M %p")
    stmt_id = _stmt_id(user_email, events, now.isoformat())
    logo_uri = _get_logo_data_uri()
    logo_img = f'<img src="{logo_uri}" class="logo"/>' if logo_uri else ""

    total_in = sum(float(e.get("amount") or 0) for e in events if e["type"] in INFLOW_TYPES)
    total_out = sum(float(e.get("amount") or 0) for e in events if e["type"] not in INFLOW_TYPES)
    net = total_in - total_out

    rows = "".join(_row_html(e, i % 2 == 1) for i, e in enumerate(events)) or \
        '<tr><td colspan="4" class="empty">No transactions in this period.</td></tr>'

    html = f"""
    <html><head><meta charset="utf-8"><style>
        @page {{
            size: A4; margin: 0;
        }}
        * {{ box-sizing: border-box; }}
        html, body {{ height: 297mm; }}
        body {{
            font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; margin: 0; font-size: 10px;
            display: flex;
            flex-direction: column;
        }}

        .band {{
            background: #3d1a5c;
            padding: 24px 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .brand-row {{ display: flex; align-items: center; gap: 10px; }}
        .logo {{ width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0; object-fit: cover; display: block; }}
        .brand-name {{ font-size: 18px; font-weight: 800; color: #fff; white-space: nowrap; }}
        .user-block {{ text-align: right; }}
        .user-name {{ font-size: 13px; font-weight: 700; color: #fff; }}
        .user-sub {{ font-size: 9px; color: rgba(255,255,255,0.8); margin-top: 2px; }}

        .title-block {{ text-align: center; padding: 22px 32px 18px 32px; }}
        .title {{ font-size: 15px; font-weight: 800; color: #111827; }}
        .subtitle {{ font-size: 9px; color: #6b7280; margin-top: 5px; }}

        .page-pad {{ padding: 0 32px; }}

        table {{ width: 100%; border-collapse: collapse; }}
        thead th {{
            text-align: left; font-size: 8.5px; font-weight: 700; color: #374151;
            padding: 12px 10px; background: #f3f4f6; border-bottom: 2px solid #e5e7eb;
        }}
        tbody td {{ padding: 14px 10px; border-bottom: 1px solid #f1f2f4; vertical-align: top; }}
        .col-date {{ width: 15%; color: #6b7280; font-size: 9px; font-weight: 600; }}
        .col-desc {{ width: 45%; }}
        .col-account {{ width: 25%; color: #6b7280; font-size: 9px; }}
        .col-amt {{ width: 15%; text-align: right; font-weight: 800; font-size: 10.5px; }}
        .tx-title {{ font-weight: 700; font-size: 10.5px; color: #111827; }}
        .tx-sub {{ font-size: 8.3px; color: #9ca3af; margin-top: 2px; }}
        .empty {{ text-align: center; color: #9ca3af; padding: 40px 0; }}

        .stats {{ display: flex; gap: 10px; padding: 20px 0; }}
        .stat {{ flex: 1; padding: 12px 14px; background: #f8f9fb; border-radius: 8px; border: 1px solid #eceef1; }}
        .stat-label {{ font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; }}
        .stat-value {{ font-size: 14px; font-weight: 800; margin-top: 4px; }}

        .footer-band {{ margin-top: auto; padding: 14px 32px; text-align: center; }}
        .footer-band .label {{ font-size: 8px; color: #9ca3af; }}
        .disclaimer {{ margin-top: 8px; font-size: 7.5px; color: #b0b4bd; line-height: 1.7; text-align: center; }}
        .bottom-strip {{ margin-top: 14px; background: #3d1a5c; height: 8px; }}
    </style></head>
    <body>
    <div class="content">
        <div class="band">
            <div class="brand-row">{logo_img}<div class="brand-name">SplitEase</div></div>
            <div class="user-block">
                <div class="user-name">{user_name}</div>
                <div class="user-sub">{user_email}</div>
            </div>
        </div>

        <div class="title-block">
            <div class="title">Transaction Statement &middot; {period_label}</div>
            <div class="subtitle">All expenses, group settlements, and adjustments on SplitEase are listed in this statement</div>
        </div>

        <div class="page-pad">
            <div class="stats">
                <div class="stat"><div class="stat-label">Total Inflow</div><div class="stat-value" style="color:#059669;">+&#8377;{_fmt(total_in)}</div></div>
                <div class="stat"><div class="stat-label">Total Outflow</div><div class="stat-value" style="color:#dc2626;">-&#8377;{_fmt(total_out)}</div></div>
                <div class="stat"><div class="stat-label">Net</div><div class="stat-value">{'+' if net>=0 else '-'}&#8377;{_fmt(abs(net))}</div></div>
            </div>

            <table>
                <thead><tr><th>Date</th><th>Transaction Details</th><th>Account / Group</th><th style="text-align:right;">Amount</th></tr></thead>
                <tbody>{rows}</tbody>
            </table>
        </div>

        <div class="footer-band">
            <div class="label">Powered by SplitEase</div>
            <div class="disclaimer">
                This is a system-generated statement and does not require a physical signature.<br/>
                Reference ID {stmt_id} &middot; Generated on {generated_at}
            </div>
        </div>
        <div class="bottom-strip"></div>
        </div>
    </body></html>
    """
    return HTML(string=html).write_pdf()