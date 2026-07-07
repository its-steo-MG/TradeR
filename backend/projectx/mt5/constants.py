from decimal import Decimal

# Must mirror the `contractSize` values in the frontend's SYMBOLS array
# (mt5-store.ts). Anything not listed here defaults to DEFAULT_CONTRACT_SIZE,
# same as the frontend's mkSym() default.
CONTRACT_SIZES = {
    'XAUUSD': Decimal('100'),
    'XAGUSD': Decimal('5000'),
}
DEFAULT_CONTRACT_SIZE = Decimal('100000')


def get_contract_size(symbol: str) -> Decimal:
    return CONTRACT_SIZES.get(symbol, DEFAULT_CONTRACT_SIZE)
