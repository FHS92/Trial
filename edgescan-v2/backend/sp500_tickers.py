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

    # Additional S&P 500 constituents (IT)
    "AKAM", "APH", "CDW", "CSCO", "CTLT", "ENPH", "FFIV", "FLIR", "GLW", "IT",
    "JKHY", "MPWR", "MSI", "MU", "NXPI", "ON", "QRVO", "STX", "TER", "TRMB",
    "TXN", "VRSN", "WDC", "XLNX",

    # Additional Consumer Discretionary
    "AMCX", "AN", "BWA", "CPRI", "CZR", "DKNG", "DPZ", "GPC", "GRMN", "HBI",
    "LAD", "LCID", "MHK", "MTZ", "NWSA", "POOL", "RIVN", "SNA", "TGT", "WHR",
    "YUM",

    # Additional Healthcare
    "ABC", "ANTM", "ATRC", "BIO", "CFG", "CRL", "DGX", "ELAN", "GKOS", "ICUI",
    "INCY", "LH", "PDCO", "PKI", "PRGO", "STE", "STKL", "SWAV", "TDOC", "TNDM",
    "UTHR", "VCYT",

    # Additional Financials
    "AIZ", "AJG", "ARES", "BAH", "BGCP", "BLKB", "BRO", "CBRE", "CFR", "CINF",
    "CIT", "EEFT", "ERIE", "EV", "EWBC", "FAF", "FHN", "GBCI", "GCMG", "HLI",
    "HOOD", "IBKR", "LAZ", "LPLA", "MFA", "NYCB", "OFG", "PIPR", "PFG", "PRIMERICA",
    "RJF", "RKT", "SEIC", "SIRI", "SLGN", "SNV", "SQ", "TROW", "VOYA", "WBS",
    "WSFS",

    # Additional Industrials
    "AGCO", "AOS", "ATI", "AYI", "BALL", "BWXT", "CFX", "CHRW", "CTAS", "EFX",
    "EXP", "EXPD", "FDX", "FELE", "GEF", "GFF", "GWW", "HII", "HWM", "JBL",
    "LCII", "LII", "LKFN", "LSTR", "MHO", "MSA", "NDSN", "OSK", "PCAR", "R",
    "RBC", "RRX", "SAIA", "SWM", "TDG", "TNC", "TXT", "UNP", "UPS", "WAB",
    "ACCO", "ALK", "ARNC", "BWA", "CW", "DAL", "HAS", "KBR", "LUV",

    # Additional Energy
    "AM", "ANDX", "CLB", "CVE", "DCP", "DKL", "ENBL", "ENB", "ET", "FANG",
    "HFC", "MMP", "MPLX", "NGL", "PAA", "PAGP", "PBFX", "PSXP", "RRC", "SBOW",
    "SM", "TRGP", "WES",

    # Additional Materials
    "AMG", "BALL", "BCC", "BMS", "CRS", "FAST", "GEF", "HUN", "IFF", "IMCD",
    "KGC", "MP", "NGVT", "OLN", "OSI", "PFGC", "RPM", "SLVM", "TREX", "UFPI",

    # Additional Real Estate
    "AIV", "AIRC", "ALEX", "APLE", "BRSP", "BRT", "COLD", "CORR", "DEA", "EPRT",
    "GMRE", "GTY", "IIPR", "ILPT", "INDUS", "JBGS", "KREF", "LTC", "MACK", "NSA",
    "PDM", "PW", "ROIC", "SAFE", "SKT", "STAG", "STOR", "TRNO",
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
