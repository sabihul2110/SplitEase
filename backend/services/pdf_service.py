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


TYPE_META = {
    "personal_expense":    {"color": "#d97706", "label": "Personal"},
    "group_expense":       {"color": "#2563eb", "label": "Group Expense"},
    "group_expense_owed":  {"color": "#dc2626", "label": "You Owe"},
    "income":              {"color": "#059669", "label": "Income"},
    "loan_given":          {"color": "#7c3aed", "label": "Loan Given"},
    "loan_taken":          {"color": "#db2777", "label": "Loan Taken"},
    "settlement_received": {"color": "#059669", "label": "Settlement In"},
    "settlement_sent":     {"color": "#2563eb", "label": "Settlement Out"},
}
INFLOW_TYPES = {"income", "settlement_received", "loan_taken"}


def _fmt(n) -> str:
    return f"{float(n or 0):,.2f}"


def _stmt_id(user_email: str, events: list[dict], iso: str) -> str:
    seed = f"{user_email}|{len(events)}|{iso}"
    digest = hashlib.sha256(seed.encode()).hexdigest()[:10].upper()
    return f"STMT-{datetime.now().strftime('%Y%m%d')}-{digest}"


def _group_by_date(events: list[dict]) -> list[tuple]:
    groups: dict = {}
    for e in events:
        groups.setdefault(e.get("date", "Unknown"), []).append(e)
    return sorted(groups.items(), key=lambda kv: kv[0], reverse=True)


def _day_label(d: str) -> str:
    try:
        dt = datetime.strptime(d, "%Y-%m-%d")
        return dt.strftime("%A, %d %B %Y")
    except Exception:
        return d


def _row_html(e: dict) -> str:
    meta = TYPE_META.get(e["type"], {"color": "#6b7280", "label": e.get("type", "").replace("_", " ").title()})
    inflow = e["type"] in INFLOW_TYPES
    sign = "+" if inflow else "\u2212"
    amt_color = "#059669" if inflow else "#111827"
    sub = e.get("sub") or ""
    grp = f' &middot; {e["group_name"]}' if e.get("group_name") else ""
    return f"""
    <div class="entry">
        <div class="entry-accent" style="background:{meta['color']};"></div>
        <div class="entry-body">
            <div class="entry-top">
                <span class="entry-title">{e.get('label','')}</span>
                <span class="entry-amt" style="color:{amt_color};">{sign}&#8377;{_fmt(e.get('amount'))}</span>
            </div>
            <div class="entry-bottom">
                <span class="entry-tag" style="color:{meta['color']};">{meta['label']}</span>
                {f'<span class="entry-sub">{sub}{grp}</span>' if sub or grp else ''}
            </div>
        </div>
    </div>
    """


def generate_statement_pdf(user_name: str, user_email: str, events: list[dict], period_label: str = "All time") -> bytes:
    now = datetime.now()
    generated_at = now.strftime("%d %B %Y &middot; %I:%M %p")
    stmt_id = _stmt_id(user_email, events, now.isoformat())
    logo_uri = _get_logo_data_uri()
    logo_img = f'<img src="{logo_uri}" class="logo"/>' if logo_uri else '<div class="logo-fallback">S</div>'

    total_in = sum(float(e.get("amount") or 0) for e in events if e["type"] in INFLOW_TYPES)
    total_out = sum(float(e.get("amount") or 0) for e in events if e["type"] not in INFLOW_TYPES)
    net = total_in - total_out
    net_color = "#059669" if net >= 0 else "#dc2626"
    net_sign = "+" if net >= 0 else "\u2212"

    if events:
        sections = []
        for day, day_events in _group_by_date(events):
            day_total = sum(
                (1 if e["type"] in INFLOW_TYPES else -1) * float(e.get("amount") or 0)
                for e in day_events
            )
            dt_color = "#059669" if day_total >= 0 else "#dc2626"
            dt_sign = "+" if day_total >= 0 else "\u2212"
            rows = "".join(_row_html(e) for e in day_events)
            sections.append(f"""
            <div class="day-section">
                <div class="day-header">
                    <span class="day-label">{_day_label(day)}</span>
                    <span class="day-total" style="color:{dt_color};">{dt_sign}&#8377;{_fmt(abs(day_total))}</span>
                </div>
                {rows}
            </div>
            """)
        body_html = "".join(sections)
    else:
        body_html = '<div class="empty">No activity recorded for this period.</div>'

    html = f"""
    <html><head><meta charset="utf-8"><style>
        @page {{
            size: A4; margin: 34px 40px 46px 40px;
            @bottom-center {{ content: "SplitEase \u00b7 Statement {stmt_id}"; font-size: 7px; color: #b0b4bd; letter-spacing: 0.4px; }}
        }}
        * {{ box-sizing: border-box; }}
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; margin: 0; }}

        .masthead {{ display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 3px solid #111827; }}
        .brand-row {{ display: flex; align-items: center; gap: 12px; }}
        .logo {{ width: 34px; height: 34px; border-radius: 8px; }}
        .logo-fallback {{ width: 34px; height: 34px; border-radius: 8px; background: #111827; color: #fff; font-weight: 800; font-size: 15px; display: flex; align-items: center; justify-content: center; }}
        .brand-name {{ font-size: 20px; font-weight: 800; letter-spacing: -0.4px; }}
        .brand-tag {{ font-size: 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-top: 1px; }}
        .stmt-badge {{ text-align: right; }}
        .stmt-badge .id {{ font-size: 9px; font-weight: 700; color: #111827; font-family: monospace; }}
        .stmt-badge .gen {{ font-size: 7.5px; color: #9ca3af; margin-top: 3px; }}

        .identity {{ display: flex; justify-content: space-between; padding: 20px 0 22px 0; }}
        .id-block .eyebrow {{ font-size: 7.5px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 5px; }}
        .id-block .primary {{ font-size: 15px; font-weight: 700; color: #111827; }}
        .id-block .secondary {{ font-size: 9.5px; color: #6b7280; margin-top: 2px; }}

        .stat-strip {{ display: flex; gap: 10px; padding: 4px 0 26px 0; }}
        .stat {{ flex: 1; padding: 13px 15px; border-radius: 10px; background: #f8f9fb; border: 1px solid #eceef1; }}
        .stat .eyebrow {{ font-size: 7px; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; }}
        .stat .value {{ font-size: 16px; font-weight: 800; margin-top: 5px; letter-spacing: -0.3px; }}
        .stat.accent {{ background: #111827; border-color: #111827; }}
        .stat.accent .eyebrow {{ color: #9ca3af; }}
        .stat.accent .value {{ color: #fff; }}

        .section-title {{ font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #111827; padding-bottom: 8px; border-bottom: 1.5px solid #111827; margin-bottom: 4px; }}

        .day-section {{ margin-top: 18px; }}
        .day-header {{ display: flex; justify-content: space-between; align-items: baseline; padding: 6px 2px; background: #f3f4f6; border-radius: 6px; padding: 7px 10px; margin-bottom: 2px; }}
        .day-label {{ font-size: 8.5px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.4px; }}
        .day-total {{ font-size: 9px; font-weight: 800; }}

        .entry {{ display: flex; padding: 11px 2px 11px 0; border-bottom: 1px solid #f1f2f4; }}
        .entry-accent {{ width: 3px; border-radius: 3px; margin-right: 10px; align-self: stretch; }}
        .entry-body {{ flex: 1; }}
        .entry-top {{ display: flex; justify-content: space-between; align-items: baseline; }}
        .entry-title {{ font-size: 10.5px; font-weight: 700; color: #111827; }}
        .entry-amt {{ font-size: 11px; font-weight: 800; }}
        .entry-bottom {{ display: flex; gap: 8px; margin-top: 3px; align-items: baseline; }}
        .entry-tag {{ font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }}
        .entry-sub {{ font-size: 8.3px; color: #9ca3af; }}

        .empty {{ text-align: center; color: #9ca3af; padding: 60px 0; font-size: 10px; }}

        .closing {{ margin-top: 30px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }}
        .closing .net-label {{ font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }}
        .closing .net-value {{ font-size: 18px; font-weight: 800; }}
        .disclaimer {{ margin-top: 22px; font-size: 7.5px; color: #b0b4bd; line-height: 1.7; }}
    </style></head>
    <body>
        <div class="masthead">
            <div class="brand-row">{logo_img}
                <div><div class="brand-name">SplitEase</div><div class="brand-tag">Financial Activity Statement</div></div>
            </div>
            <div class="stmt-badge"><div class="id">{stmt_id}</div><div class="gen">Generated {generated_at}</div></div>
        </div>

        <div class="identity">
            <div class="id-block"><div class="eyebrow">Account Holder</div><div class="primary">{user_name}</div><div class="secondary">{user_email}</div></div>
            <div class="id-block" style="text-align:right;"><div class="eyebrow">Statement Period</div><div class="primary">{period_label}</div></div>
        </div>

        <div class="stat-strip">
            <div class="stat"><div class="eyebrow">Total Inflow</div><div class="value" style="color:#059669;">+&#8377;{_fmt(total_in)}</div></div>
            <div class="stat"><div class="eyebrow">Total Outflow</div><div class="value" style="color:#dc2626;">&minus;&#8377;{_fmt(total_out)}</div></div>
            <div class="stat"><div class="eyebrow">Entries</div><div class="value">{len(events)}</div></div>
            <div class="stat accent"><div class="eyebrow">Net Position</div><div class="value">{net_sign}&#8377;{_fmt(abs(net))}</div></div>
        </div>

        <div class="section-title">Transaction Detail</div>
        {body_html}

        <div class="closing">
            <span class="net-label">Net for statement period</span>
            <span class="net-value" style="color:{net_color};">{net_sign}&#8377;{_fmt(abs(net))}</span>
        </div>

        <div class="disclaimer">
            This is a system-generated statement from SplitEase and does not require a physical signature.<br/>
            Reference ID {stmt_id} &middot; For queries, contact support through the SplitEase app.
        </div>
    </body></html>
    """
    return HTML(string=html).write_pdf()