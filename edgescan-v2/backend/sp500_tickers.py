"""
sp500_tickers.py — Current S&P 500 constituent tickers for EdgeScan v2.

Last updated: May 2025.
Source: S&P Dow Jones Indices constituent list.
"""

SP500_TICKERS: list[str] = [
    # Information Technology
    "AAPL", "MSFT", "NVDA", "AVGO", "ORCL", "CRM", "ACN", "AMD", "NOW", "INTU",
    "IBM", "TXN", "QCOM", "AMAT", "LRCX", "ADI", "KLAC", "SNPS", "CDNS", "MCHP",
    "FTNT", "PANW", "CRWD", "ADSK", "ANSS", "CTSH", "EPAM", "GDDY", "HPQ", "HPE",
    "JNPR", "KEYS", "LDOS", "NTAP", "PTC", "SWKS", "TRMB", "VRSN", "WDC", "ZBRA",

    # Communication Services
    "META", "GOOGL", "GOOG", "NFLX", "DIS", "CMCSA", "T", "VZ", "TMUS", "CHTR",
    "EA", "TTWO", "OMC", "IPG", "LYV", "NWSA", "NWS", "FOX", "FOXA", "WBD",

    # Consumer Discretionary
    "AMZN", "TSLA", "HD", "MCD", "NKE", "LOW", "SBUX", "TJX", "BKNG", "MAR",
    "GM", "F", "APTV", "TSCO", "ROST", "DHI", "LEN", "NVR", "PHM", "TOL",
    "AZO", "ORLY", "BBY", "KMX", "ULTA", "EXPE", "HLT", "MGM", "NCLH", "RCL",
    "CCL", "LVS", "WYNN", "VFC", "HAS", "MAT", "RL", "PVH", "TPR", "ETSY",

    # Consumer Staples
    "WMT", "COST", "PG", "KO", "PEP", "PM", "MO", "MDLZ", "CL", "KMB",
    "GIS", "K", "HSY", "MKC", "SJM", "CAG", "CPB", "HRL", "MNST", "REYN",
    "CHD", "EL", "CLX", "BG", "ADM", "TSN", "HFC", "COTY", "KR", "SFM",

    # Healthcare
    "LLY", "UNH", "JNJ", "ABBV", "MRK", "TMO", "ABT", "DHR", "BMY", "AMGN",
    "GILD", "SYK", "MDT", "ELV", "CI", "HUM", "CVS", "VRTX", "REGN", "ISRG",
    "ZBH", "EW", "BAX", "BDX", "BSX", "CAH", "CNC", "COO", "DVA", "DXCM",
    "GEHC", "HCA", "HOLX", "IQV", "MCK", "MOH", "MTD", "RMD", "TECH", "WAT",
    "ZTS", "ALGN", "A", "BIIB", "IDXX",

    # Financials
    "JPM", "V", "MA", "BAC", "WFC", "GS", "MS", "SCHW", "BLK", "AXP",
    "USB", "TFC", "PNC", "COF", "C", "STT", "MTB", "NTRS", "SIVB", "HBAN",
    "KEY", "RF", "CFG", "FRC", "FITB", "BK", "DFS", "SYF", "ALLY", "NDAQ",
    "ICE", "CME", "CBOE", "MKTX", "SPGI", "MCO", "FDS", "IEX", "BRO", "WTW",
    "MMC", "AON", "MET", "PRU", "UNM", "AFL", "LNC", "HIG", "ALL", "PGR",
    "CB", "TRV", "CNA", "CINF", "GL", "BRK-B",

    # Industrials
    "GE", "CAT", "HON", "DE", "UPS", "BA", "RTX", "LMT", "NOC", "GD",
    "MMM", "EMR", "ETN", "ITW", "PH", "ROK", "DOV", "IR", "XYL", "OTIS",
    "CARR", "AME", "FAST", "GWW", "IEX", "INFO", "J", "JBHT", "KNX", "LSTR",
    "MAS", "NDSN", "PCAR", "PKG", "PWR", "RHI", "RSG", "SAIA", "SWK", "TDG",
    "TT", "URI", "VRSK", "WM", "WRK", "XPO",

    # Energy
    "XOM", "CVX", "COP", "EOG", "SLB", "PXD", "MPC", "PSX", "VLO", "HES",
    "OXY", "DVN", "FANG", "HAL", "BKR", "APA", "MRO", "OKE", "WMB", "KMI",
    "LNG", "CTRA", "EQT", "AR", "CNX",

    # Materials
    "LIN", "APD", "ECL", "SHW", "NEM", "FCX", "NUE", "STLD", "RS", "CF",
    "MOS", "FMC", "PPG", "VMC", "MLM", "ALB", "CEG", "DD", "DOW", "EMN",
    "IP", "PKG", "SEE", "SON", "WRK",

    # Real Estate
    "PLD", "AMT", "CCI", "EQIX", "O", "PSA", "SPG", "WELL", "DLR", "VICI",
    "ARE", "AVB", "BXP", "CPT", "EQR", "ESS", "EXR", "FRT", "HST", "IRM",
    "KIM", "MAA", "NNN", "PEAK", "REG", "SBA", "UDR", "VTR",

    # Utilities
    "NEE", "DUK", "SO", "D", "AEP", "EXC", "SRE", "XEL", "WEC", "ES",
    "ED", "ETR", "FE", "PPL", "CNP", "CMS", "AEE", "DTE", "EVRG", "NI",
    "NRG", "OGE", "PNW", "POR",
]

# Remove any duplicates while preserving order
_seen: set[str] = set()
_deduped: list[str] = []
for _t in SP500_TICKERS:
    if _t not in _seen:
        _seen.add(_t)
        _deduped.append(_t)
SP500_TICKERS = _deduped

__all__ = ["SP500_TICKERS"]
