"""Camada de pagamento.

`DemoGateway` aprova imediatamente e NÃO movimenta dinheiro real. Para produção,
implemente um gateway com a mesma interface (ex.: Mercado Pago, Stripe, Pagar.me),
criando a cobrança Pix/cartão e marcando o ingresso como pago via webhook.
"""

from ..config import get_settings


def processing_fee_cents(price_cents: int) -> int:
    """Taxa do provedor de pagamento, calculada no servidor (nunca confiar no cliente)."""
    if price_cents <= 0:
        return 0
    s = get_settings()
    return round(price_cents * s.payment_fee_percent / 100) + s.payment_fee_fixed_cents


class DemoGateway:
    name = "demo"

    def charge(self, amount_cents: int, method: str) -> str:
        return "paid"


gateway = DemoGateway()
