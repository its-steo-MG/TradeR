# agents/utils.py
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch
from django.utils import timezone
from dashboard.models import Transaction
import logging

logger = logging.getLogger(__name__)


def generate_withdrawal_receipt_pdf(withdrawal, include_history=True, history_limit=25):
    """
    Generate a professional PDF receipt for a completed agent withdrawal.
    Includes the current withdrawal + recent transaction history.
    """
    try:
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=12,
            textColor=colors.HexColor('#1a1a2e'),
            alignment=1  # center
        )

        normal = styles['Normal']
        heading2 = styles['Heading2']

        story = []

        # ========== HEADER ==========
        story.append(Paragraph("TradeRiser – Transaction Receipt", title_style))
        story.append(Paragraph(
            f"Generated: {timezone.localtime().strftime('%Y-%m-%d %H:%M %Z')}",
            normal
        ))
        story.append(Spacer(1, 20))

        # ========== WITHDRAWAL DETAILS ==========
        story.append(Paragraph("<b>Withdrawal Details</b>", heading2))
        story.append(Spacer(1, 8))

        completed_at = "—"
        if withdrawal.completed_at:
            completed_at = timezone.localtime(withdrawal.completed_at).strftime('%Y-%m-%d %H:%M')

        details = [
            ["Receipt ID", f"WD-{withdrawal.id}"],
            ["User", withdrawal.user.get_full_name() or withdrawal.user.username],
            ["Email", withdrawal.user.email or "—"],
            ["Account", str(withdrawal.account)],
            ["Amount (USD)", f"${withdrawal.amount_usd:,.2f}"],
            ["Amount (KES)", f"KSh {withdrawal.amount_kes:,.2f}"],
            ["Method", withdrawal.get_payment_method_display()],
            ["Agent", withdrawal.agent.name],
            ["Status", "Completed"],
            ["Completed At", completed_at],
        ]

        # Payout destination
        if withdrawal.payment_method == 'paypal':
            details.append(["PayPal Email", withdrawal.user_paypal_email or "—"])
        elif withdrawal.payment_method == 'bank_transfer':
            details.append(["Bank", withdrawal.user_bank_name or "—"])
            details.append(["Account Name", withdrawal.user_bank_account_name or "—"])
            details.append(["Account Number", withdrawal.user_bank_account_number or "—"])
            details.append(["SWIFT", withdrawal.user_bank_swift or "—"])
        elif withdrawal.payment_method == 'binance':
            details.append(["Binance Address", withdrawal.user_binance_address or "—"])
        else:  # mpesa
            phone = getattr(withdrawal.user, 'phone', None) or "—"
            details.append(["M-Pesa Phone", phone])

        table = Table(details, colWidths=[2.3 * inch, 4.2 * inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(table)
        story.append(Spacer(1, 25))

        # ========== TRANSACTION HISTORY ==========
        if include_history:
            story.append(Paragraph("<b>Transaction History</b>", heading2))
            story.append(Spacer(1, 8))

            txs = Transaction.objects.filter(
                account=withdrawal.account
            ).order_by('-created_at')[:history_limit]

            if txs.exists():
                data = [["Date", "Type", "Amount (USD)", "Description"]]

                for t in txs:
                    amount = t.amount
                    if amount >= 0:
                        amount_str = f"${amount:,.2f}"
                    else:
                        amount_str = f"-${abs(amount):,.2f}"

                    data.append([
                        timezone.localtime(t.created_at).strftime('%Y-%m-%d %H:%M'),
                        t.transaction_type.title() if t.transaction_type else "—",
                        amount_str,
                        (t.description or "")[:50]
                    ])

                hist_table = Table(data, colWidths=[1.4 * inch, 1.1 * inch, 1.3 * inch, 2.7 * inch])
                hist_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                    ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f8f8')]),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                story.append(hist_table)
            else:
                story.append(Paragraph("No previous transactions found.", normal))

        # ========== FOOTER ==========
        story.append(Spacer(1, 30))
        footer_style = ParagraphStyle(
            'Footer',
            parent=normal,
            fontSize=8,
            textColor=colors.grey,
            alignment=1
        )
        story.append(Paragraph(
            "This is an official receipt from TradeRiser. "
            "If you have any questions, contact support.",
            footer_style
        ))

        doc.build(story)
        buffer.seek(0)
        return buffer

    except Exception as e:
        logger.error(f"Failed to generate PDF receipt for withdrawal {getattr(withdrawal, 'id', '?')}: {e}")
        # Return a minimal PDF so the email still sends
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = [
            Paragraph("TradeRiser – Transaction Receipt", styles['Heading1']),
            Spacer(1, 20),
            Paragraph(f"Withdrawal ID: WD-{getattr(withdrawal, 'id', 'N/A')}", styles['Normal']),
            Paragraph(f"Amount: ${getattr(withdrawal, 'amount_usd', 0):,.2f}", styles['Normal']),
            Paragraph("Receipt generation failed. Please contact support.", styles['Normal']),
        ]
        doc.build(story)
        buffer.seek(0)
        return buffer