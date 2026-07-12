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


# Simplified meta - we no longer need heavy background colors, just clean text labels.
TYPE_META = {
    "personal_expense":    {"label": "Personal Expense"},
    "group_expense":       {"label": "Group Expense"},
    "group_expense_owed":  {"label": "You Owe"},
    "income":              {"label": "Income"},
    "loan_given":          {"label": "Loan Given"},
    "loan_taken":          {"label": "Loan Taken"},
    "settlement_received": {"label": "Settlement Received"},
    "settlement_sent":     {"label": "Settlement Sent"},
}

INFLOW_TYPES = {"income", "settlement_received", "loan_taken"}


def _fmt_amount(n) -> str:
    return f"{float(n or 0):,.2f}"


def _statement_id(user_email: str, events: list[dict], generated_at_iso: str) -> str:
    seed = f"{user_email}|{len(events)}|{generated_at_iso}"
    digest = hashlib.sha256(seed.encode()).hexdigest()[:10].upper()
    date_part = datetime.now().strftime("%Y%m%d")
    return f"STMT-{date_part}-{digest}"


def _row_html(event: dict) -> str:
    meta = TYPE_META.get(event["type"], {"label": event.get("type", "Transaction").replace("_", " ").title()})
    inflow = event["type"] in INFLOW_TYPES
    
    # Keeping colors minimal: standard black for outflow, subtle green for inflow
    amount_color = "#059669" if inflow else "#111827"
    
    # Group names map well to Navi's "Account" column
    account_group = event.get("group_name") or "SplitEase Wallet"
    
    # Formatting date slightly to allow stacking (e.g., separating date and time if your data has it)
    raw_date = event.get('date', '')
    date_display = raw_date.replace(" ", "<br/>") if " " in raw_date else f"{raw_date}<br/><span style='color:transparent;'>-</span>"

    return f"""
    <tr>
        <td class="col-date">{date_display}</td>
        <td class="col-desc">
            <div class="primary-text">{event.get('label', 'Transaction')}</div>
            <div class="secondary-text">Type: {meta['label']}</div>
            {f'<div class="secondary-text">Note: {event.get("sub")}</div>' if event.get("sub") else ''}
        </td>
        <td class="col-account">{account_group}</td>
        <td class="col-amt" style="color:{amount_color};">
            &#8377;{_fmt_amount(event.get('amount'))}
        </td>
    </tr>
    """


def generate_statement_pdf(
    user_name: str, user_email: str, events: list[dict], period_label: str = "All time",
) -> bytes:
    now = datetime.now()
    generated_at = now.strftime("%d %b %Y, %I:%M %p")
    stmt_id = _statement_id(user_email, events, now.isoformat())
    logo_uri = _get_logo_data_uri()

    total_in = sum(float(e.get("amount") or 0) for e in events if e["type"] in INFLOW_TYPES)
    total_out = sum(float(e.get("amount") or 0) for e in events if e["type"] not in INFLOW_TYPES)
    net = total_in - total_out

    rows_html = "".join(_row_html(e) for e in events) or '<tr><td colspan="4" class="empty">No transactions in this period.</td></tr>'

    logo_img = (
        f'<img src="{logo_uri}" class="logo-img" />' if logo_uri
        else '<div class="logo-fallback">SE</div>'
    )

    html = f"""
    <html>
    <head>
    <meta charset="utf-8">
    <style>
        @page {{
            size: A4;
            margin: 40px 0;
            @bottom-center {{
                content: "Powered by SplitEase";
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 8px;
                color: #9ca3af;
                letter-spacing: 0.5px;
            }}
        }}
        * {{ box-sizing: border-box; }}
        body {{
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #111827;
            font-size: 10px;
            margin: 0;
            line-height: 1.4;
        }}
        .page-pad {{ padding: 0 48px; }}

        /* Clean, minimalist header replacing the blue gradient */
        .header {{
            padding: 0 48px 24px 48px;
            display: flex;
            align-items: center;
            border-bottom: 2px solid #111827;
            margin-bottom: 24px;
        }}
        .logo-img {{ width: 32px; height: 32px; margin-right: 12px; }}
        .logo-fallback {{
            width: 32px; height: 32px; border-radius: 4px;
            background: #111827; color: #fff;
            font-size: 14px; font-weight: 800;
            display: flex; align-items: center; justify-content: center;
            margin-right: 12px;
        }}
        .brand {{ font-size: 18px; font-weight: 800; color: #111827; display: inline-block; }}
        .brand-sub {{ font-size: 9px; color: #6b7280; letter-spacing: 0.5px; margin-left: 8px; display: inline-block; vertical-align: bottom; margin-bottom: 2px; }}

        /* User details mimicking Navi's straightforward presentation */
        .user-details {{
            padding: 0 48px 32px 48px;
        }}
        .user-name {{ font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px; }}
        .user-contact {{ font-size: 11px; color: #4b5563; margin-bottom: 16px; }}
        .statement-period {{ font-size: 10px; color: #111827; font-weight: 600; margin-bottom: 4px; }}
        .statement-note {{ font-size: 9px; color: #6b7280; }}

        /* Clean table layout without backgrounds or pill tags */
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
        thead th {{
            text-align: left; 
            font-size: 9px; 
            font-weight: 700;
            color: #4b5563; 
            padding: 12px 8px;
            border-top: 1px solid #e5e7eb;
            border-bottom: 1px solid #e5e7eb;
        }}
        tbody td {{ 
            padding: 16px 8px; 
            border-bottom: 1px solid #f3f4f6; 
            vertical-align: top; 
        }}
        
        .col-date {{ width: 15%; color: #4b5563; font-size: 9.5px; line-height: 1.6; }}
        .col-desc {{ width: 45%; }}
        .col-account {{ width: 25%; color: #4b5563; font-size: 9.5px; }}
        .col-amt {{ width: 15%; text-align: right; font-weight: 600; font-size: 11px; }}
        
        .primary-text {{ font-weight: 600; font-size: 10.5px; color: #111827; margin-bottom: 4px; }}
        .secondary-text {{ font-size: 9px; color: #6b7280; margin-bottom: 2px; }}
        .empty {{ text-align: center; color: #9ca3af; padding: 40px 0; font-style: italic; }}

        /* Simple footer stats instead of big summary cards */
        .summary-footer {{
            margin-top: 32px;
            border-top: 1px solid #e5e7eb;
            padding-top: 16px;
            display: flex;
            justify-content: flex-end;
            font-size: 10px;
        }}
        .summary-footer table {{ width: 250px; margin-top: 0; }}
        .summary-footer td {{ padding: 6px 0; border: none; font-size: 10px; }}
        .summary-footer .label {{ color: #4b5563; }}
        .summary-footer .val {{ text-align: right; font-weight: 600; }}
        .summary-footer .net-row td {{ border-top: 1px solid #e5e7eb; padding-top: 8px; font-weight: 700; font-size: 11px; }}

        .disclaimer {{
            margin-top: 48px; font-size: 8px; color: #9ca3af; line-height: 1.6;
            border-top: 1px dashed #e5e7eb; padding-top: 16px; text-align: justify;
        }}
    </style>
    </head>
    <body>
        <div class="header">
            {logo_img}
            <div class="brand">SplitEase</div>
            <div class="brand-sub">FINANCIAL ACTIVITY STATEMENT</div>
        </div>

        <div class="user-details">
            <div class="user-name">{user_name}</div>
            <div class="user-contact">{user_email}</div>
            <br/>
            <div class="statement-period">Transaction statement for {period_label}</div>
            <div class="statement-note">All SplitEase expenses, group settlements, and manual adjustments are listed in this statement.</div>
        </div>

        <div class="page-pad">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Transaction details</th>
                        <th>Account / Group</th>
                        <th style="text-align:right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>

            <div class="summary-footer">
                <table>
                    <tr>
                        <td class="label">Total Inflow</td>
                        <td class="val" style="color:#059669;">&#8377;{_fmt_amount(total_in)}</td>
                    </tr>
                    <tr>
                        <td class="label">Total Outflow</td>
                        <td class="val">&#8377;{_fmt_amount(total_out)}</td>
                    </tr>
                    <tr class="net-row">
                        <td class="label">Net Balance</td>
                        <td class="val">&#8377;{_fmt_amount(net)}</td>
                    </tr>
                </table>
            </div>

            <div class="disclaimer">
                This is a system-generated statement from SplitEase and does not require a physical signature.<br/>
                Reference ID: {stmt_id} &middot; Generated on {generated_at}<br/>
                For queries regarding this statement, please contact support through the SplitEase app.
            </div>
        </div>
    </body>
    </html>
    """

    return HTML(string=html).write_pdf()