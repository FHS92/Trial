#!/usr/bin/env python3
"""
seed_dummy_data.py — Populate EdgeScan v2 SQLite DB with realistic dummy data for all S&P 500 stocks.

Run from the backend/ directory:
    python seed_dummy_data.py

Generates:
  - ~500 scan_results rows (one per deduplicated ticker)
  - ~126k price_history rows (252 trading days per ticker)
  - 30 thesis_cache rows (top stocks by score)
  - 1 scan_run record
"""

import json
import math
import random
import sqlite3
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from sp500_tickers import SP500_TICKERS  # noqa: E402

random.seed(42)

DB_PATH = Path(__file__).parent / "edgescan_v2.db"

# ─────────────────────────────────────────────────────────────────
# Company metadata: ticker → (name, sector, industry, base_price)
# ─────────────────────────────────────────────────────────────────

TICKER_META: dict[str, tuple[str, str, str, float]] = {
    # Information Technology
    "AAPL": ("Apple Inc.", "Information Technology", "Consumer Electronics", 191.0),
    "MSFT": ("Microsoft Corporation", "Information Technology", "Systems Software", 424.0),
    "NVDA": ("NVIDIA Corporation", "Information Technology", "Semiconductors", 875.0),
    "AVGO": ("Broadcom Inc.", "Information Technology", "Semiconductors", 1380.0),
    "ORCL": ("Oracle Corporation", "Information Technology", "Systems Software", 136.0),
    "CRM": ("Salesforce Inc.", "Information Technology", "Application Software", 296.0),
    "ACN": ("Accenture plc", "Information Technology", "IT Consulting & Services", 352.0),
    "AMD": ("Advanced Micro Devices", "Information Technology", "Semiconductors", 162.0),
    "NOW": ("ServiceNow Inc.", "Information Technology", "Application Software", 762.0),
    "INTU": ("Intuit Inc.", "Information Technology", "Application Software", 635.0),
    "IBM": ("IBM Corporation", "Information Technology", "IT Consulting & Services", 183.0),
    "TXN": ("Texas Instruments", "Information Technology", "Semiconductors", 182.0),
    "QCOM": ("Qualcomm Inc.", "Information Technology", "Semiconductors", 175.0),
    "AMAT": ("Applied Materials", "Information Technology", "Semiconductor Equipment", 220.0),
    "LRCX": ("Lam Research", "Information Technology", "Semiconductor Equipment", 900.0),
    "ADI": ("Analog Devices", "Information Technology", "Semiconductors", 210.0),
    "KLAC": ("KLA Corporation", "Information Technology", "Semiconductor Equipment", 780.0),
    "SNPS": ("Synopsys Inc.", "Information Technology", "EDA Software", 560.0),
    "CDNS": ("Cadence Design Systems", "Information Technology", "EDA Software", 290.0),
    "MCHP": ("Microchip Technology", "Information Technology", "Semiconductors", 88.0),
    "FTNT": ("Fortinet Inc.", "Information Technology", "Systems Software", 75.0),
    "PANW": ("Palo Alto Networks", "Information Technology", "Systems Software", 340.0),
    "CRWD": ("CrowdStrike Holdings", "Information Technology", "Systems Software", 340.0),
    "ADSK": ("Autodesk Inc.", "Information Technology", "Application Software", 245.0),
    "CSCO": ("Cisco Systems", "Information Technology", "Communications Equipment", 49.0),
    "MU": ("Micron Technology", "Information Technology", "Semiconductors", 120.0),
    "HPQ": ("HP Inc.", "Information Technology", "Technology Hardware", 33.0),
    "HPE": ("Hewlett Packard Enterprise", "Information Technology", "Technology Hardware", 19.0),
    "STX": ("Seagate Technology", "Information Technology", "Technology Hardware", 95.0),
    "WDC": ("Western Digital", "Information Technology", "Technology Hardware", 65.0),
    "KEYS": ("Keysight Technologies", "Information Technology", "Electronic Equipment", 150.0),
    "GLW": ("Corning Inc.", "Information Technology", "Electronic Components", 39.0),
    "APH": ("Amphenol Corporation", "Information Technology", "Electronic Components", 125.0),
    "NTAP": ("NetApp Inc.", "Information Technology", "Technology Hardware", 105.0),
    "FFIV": ("F5 Inc.", "Information Technology", "Communications Equipment", 195.0),
    "MSI": ("Motorola Solutions", "Information Technology", "Communications Equipment", 380.0),
    "CDW": ("CDW Corporation", "Information Technology", "IT Services", 195.0),
    "GDDY": ("GoDaddy Inc.", "Information Technology", "Internet Services", 115.0),
    "VRSN": ("VeriSign Inc.", "Information Technology", "Internet Services", 195.0),
    "AKAM": ("Akamai Technologies", "Information Technology", "Internet Services", 108.0),
    "JKHY": ("Jack Henry & Associates", "Information Technology", "Data Processing Services", 175.0),
    "MPWR": ("Monolithic Power Systems", "Information Technology", "Semiconductors", 620.0),
    "NXPI": ("NXP Semiconductors", "Information Technology", "Semiconductors", 225.0),
    "ON": ("ON Semiconductor", "Information Technology", "Semiconductors", 68.0),
    "SWKS": ("Skyworks Solutions", "Information Technology", "Semiconductors", 90.0),
    "QRVO": ("Qorvo Inc.", "Information Technology", "Semiconductors", 65.0),
    "TER": ("Teradyne Inc.", "Information Technology", "Semiconductor Equipment", 110.0),
    "IT": ("Gartner Inc.", "Information Technology", "IT Consulting & Services", 450.0),
    "CTSH": ("Cognizant Technology", "Information Technology", "IT Consulting & Services", 68.0),
    "EPAM": ("EPAM Systems", "Information Technology", "IT Consulting & Services", 240.0),
    "LDOS": ("Leidos Holdings", "Information Technology", "IT Services", 135.0),
    "PTC": ("PTC Inc.", "Information Technology", "Application Software", 175.0),
    "TRMB": ("Trimble Inc.", "Information Technology", "Electronic Equipment", 55.0),
    "ANSS": ("ANSYS Inc.", "Information Technology", "Application Software", 330.0),
    "ZBRA": ("Zebra Technologies", "Information Technology", "Electronic Equipment", 290.0),
    "ENPH": ("Enphase Energy", "Information Technology", "Semiconductors", 90.0),
    "FLIR": ("Teledyne FLIR", "Information Technology", "Electronic Equipment", 42.0),
    "CTLT": ("Catalent Inc.", "Information Technology", "Life Sciences Equipment", 40.0),
    "XLNX": ("Xilinx Inc.", "Information Technology", "Semiconductors", 185.0),
    "BLKB": ("Blackbaud Inc.", "Information Technology", "Application Software", 75.0),
    # Communication Services
    "META": ("Meta Platforms", "Communication Services", "Interactive Media & Services", 510.0),
    "GOOGL": ("Alphabet Inc. Class A", "Communication Services", "Interactive Media & Services", 170.0),
    "GOOG": ("Alphabet Inc. Class C", "Communication Services", "Interactive Media & Services", 171.0),
    "NFLX": ("Netflix Inc.", "Communication Services", "Movies & Entertainment", 625.0),
    "DIS": ("The Walt Disney Company", "Communication Services", "Movies & Entertainment", 111.0),
    "CMCSA": ("Comcast Corporation", "Communication Services", "Cable & Satellite", 40.0),
    "T": ("AT&T Inc.", "Communication Services", "Integrated Telecom", 18.0),
    "VZ": ("Verizon Communications", "Communication Services", "Integrated Telecom", 41.0),
    "TMUS": ("T-Mobile US", "Communication Services", "Wireless Telecom", 190.0),
    "CHTR": ("Charter Communications", "Communication Services", "Cable & Satellite", 395.0),
    "EA": ("Electronic Arts", "Communication Services", "Interactive Home Entertainment", 128.0),
    "TTWO": ("Take-Two Interactive", "Communication Services", "Interactive Home Entertainment", 155.0),
    "OMC": ("Omnicom Group", "Communication Services", "Advertising", 85.0),
    "IPG": ("Interpublic Group", "Communication Services", "Advertising", 30.0),
    "LYV": ("Live Nation Entertainment", "Communication Services", "Movies & Entertainment", 95.0),
    "NWSA": ("News Corp Class A", "Communication Services", "Publishing", 26.0),
    "NWS": ("News Corp Class B", "Communication Services", "Publishing", 26.0),
    "FOX": ("Fox Corporation Class B", "Communication Services", "Broadcasting", 35.0),
    "FOXA": ("Fox Corporation Class A", "Communication Services", "Broadcasting", 36.0),
    "WBD": ("Warner Bros. Discovery", "Communication Services", "Movies & Entertainment", 9.0),
    "SIRI": ("Sirius XM Holdings", "Communication Services", "Broadcasting", 3.5),
    "AMCX": ("AMC Networks", "Communication Services", "Broadcasting", 9.0),
    # Consumer Discretionary
    "AMZN": ("Amazon.com Inc.", "Consumer Discretionary", "Internet Retail", 183.0),
    "TSLA": ("Tesla Inc.", "Consumer Discretionary", "Automobile Manufacturers", 175.0),
    "HD": ("The Home Depot", "Consumer Discretionary", "Home Improvement Retail", 360.0),
    "MCD": ("McDonald's Corporation", "Consumer Discretionary", "Restaurants", 285.0),
    "NKE": ("Nike Inc.", "Consumer Discretionary", "Footwear", 93.0),
    "LOW": ("Lowe's Companies", "Consumer Discretionary", "Home Improvement Retail", 225.0),
    "SBUX": ("Starbucks Corporation", "Consumer Discretionary", "Restaurants", 92.0),
    "TJX": ("TJX Companies", "Consumer Discretionary", "Apparel Retail", 103.0),
    "BKNG": ("Booking Holdings", "Consumer Discretionary", "Hotels, Resorts & Cruise Lines", 3700.0),
    "MAR": ("Marriott International", "Consumer Discretionary", "Hotels, Resorts & Cruise Lines", 250.0),
    "GM": ("General Motors", "Consumer Discretionary", "Automobile Manufacturers", 47.0),
    "F": ("Ford Motor Company", "Consumer Discretionary", "Automobile Manufacturers", 12.0),
    "APTV": ("Aptiv PLC", "Consumer Discretionary", "Auto Parts", 68.0),
    "TSCO": ("Tractor Supply Company", "Consumer Discretionary", "Specialty Stores", 245.0),
    "ROST": ("Ross Stores", "Consumer Discretionary", "Apparel Retail", 145.0),
    "DHI": ("D.R. Horton", "Consumer Discretionary", "Homebuilding", 155.0),
    "LEN": ("Lennar Corporation", "Consumer Discretionary", "Homebuilding", 145.0),
    "NVR": ("NVR Inc.", "Consumer Discretionary", "Homebuilding", 7500.0),
    "PHM": ("PulteGroup Inc.", "Consumer Discretionary", "Homebuilding", 115.0),
    "TOL": ("Toll Brothers", "Consumer Discretionary", "Homebuilding", 135.0),
    "AZO": ("AutoZone Inc.", "Consumer Discretionary", "Specialty Retail", 3100.0),
    "ORLY": ("O'Reilly Automotive", "Consumer Discretionary", "Specialty Retail", 1050.0),
    "BBY": ("Best Buy Co.", "Consumer Discretionary", "Specialty Stores", 77.0),
    "KMX": ("CarMax Inc.", "Consumer Discretionary", "Specialty Stores", 78.0),
    "ULTA": ("Ulta Beauty", "Consumer Discretionary", "Specialty Stores", 410.0),
    "EXPE": ("Expedia Group", "Consumer Discretionary", "Hotels, Resorts & Cruise Lines", 135.0),
    "HLT": ("Hilton Worldwide", "Consumer Discretionary", "Hotels, Resorts & Cruise Lines", 210.0),
    "MGM": ("MGM Resorts", "Consumer Discretionary", "Casinos & Gaming", 42.0),
    "NCLH": ("Norwegian Cruise Line", "Consumer Discretionary", "Hotels, Resorts & Cruise Lines", 19.0),
    "RCL": ("Royal Caribbean Group", "Consumer Discretionary", "Hotels, Resorts & Cruise Lines", 155.0),
    "CCL": ("Carnival Corporation", "Consumer Discretionary", "Hotels, Resorts & Cruise Lines", 19.0),
    "LVS": ("Las Vegas Sands", "Consumer Discretionary", "Casinos & Gaming", 49.0),
    "WYNN": ("Wynn Resorts", "Consumer Discretionary", "Casinos & Gaming", 96.0),
    "VFC": ("VF Corporation", "Consumer Discretionary", "Apparel & Accessories", 13.0),
    "HAS": ("Hasbro Inc.", "Consumer Discretionary", "Leisure Products", 52.0),
    "MAT": ("Mattel Inc.", "Consumer Discretionary", "Leisure Products", 19.0),
    "RL": ("Ralph Lauren", "Consumer Discretionary", "Apparel & Accessories", 190.0),
    "PVH": ("PVH Corp.", "Consumer Discretionary", "Apparel & Accessories", 105.0),
    "TPR": ("Tapestry Inc.", "Consumer Discretionary", "Apparel & Accessories", 45.0),
    "ETSY": ("Etsy Inc.", "Consumer Discretionary", "Internet Retail", 62.0),
    "TGT": ("Target Corporation", "Consumer Discretionary", "General Merchandise Stores", 168.0),
    "YUM": ("Yum! Brands", "Consumer Discretionary", "Restaurants", 134.0),
    "DPZ": ("Domino's Pizza", "Consumer Discretionary", "Restaurants", 415.0),
    "POOL": ("Pool Corporation", "Consumer Discretionary", "Distributors", 335.0),
    "GRMN": ("Garmin Ltd.", "Consumer Discretionary", "Consumer Electronics", 157.0),
    "WHR": ("Whirlpool Corporation", "Consumer Discretionary", "Household Appliances", 98.0),
    "MHK": ("Mohawk Industries", "Consumer Discretionary", "Home Furnishings", 118.0),
    "AN": ("AutoNation Inc.", "Consumer Discretionary", "Specialty Stores", 145.0),
    "LAD": ("Lithia Motors", "Consumer Discretionary", "Specialty Stores", 272.0),
    "CZR": ("Caesars Entertainment", "Consumer Discretionary", "Casinos & Gaming", 33.0),
    "GPC": ("Genuine Parts Company", "Consumer Discretionary", "Distributors", 139.0),
    "SNA": ("Snap-on Incorporated", "Consumer Discretionary", "Industrial Conglomerates", 288.0),
    "BWA": ("BorgWarner Inc.", "Consumer Discretionary", "Auto Parts", 33.0),
    "HBI": ("Hanesbrands Inc.", "Consumer Discretionary", "Apparel & Accessories", 7.0),
    "CPRI": ("Capri Holdings", "Consumer Discretionary", "Apparel & Accessories", 22.0),
    "DKNG": ("DraftKings Inc.", "Consumer Discretionary", "Casinos & Gaming", 38.0),
    "LCID": ("Lucid Group", "Consumer Discretionary", "Automobile Manufacturers", 3.0),
    "RIVN": ("Rivian Automotive", "Consumer Discretionary", "Automobile Manufacturers", 11.0),
    "MTZ": ("MasTec Inc.", "Consumer Discretionary", "Construction & Engineering", 118.0),
    "LCII": ("LCI Industries", "Consumer Discretionary", "Auto Parts", 100.0),
    "MHO": ("M/I Homes Inc.", "Consumer Discretionary", "Homebuilding", 122.0),
    # Consumer Staples
    "WMT": ("Walmart Inc.", "Consumer Staples", "Hypermarkets & Super Centers", 65.0),
    "COST": ("Costco Wholesale", "Consumer Staples", "Hypermarkets & Super Centers", 840.0),
    "PG": ("Procter & Gamble", "Consumer Staples", "Household Products", 165.0),
    "KO": ("The Coca-Cola Company", "Consumer Staples", "Soft Drinks", 62.0),
    "PEP": ("PepsiCo Inc.", "Consumer Staples", "Soft Drinks", 171.0),
    "PM": ("Philip Morris International", "Consumer Staples", "Tobacco", 98.0),
    "MO": ("Altria Group", "Consumer Staples", "Tobacco", 45.0),
    "MDLZ": ("Mondelez International", "Consumer Staples", "Packaged Foods", 68.0),
    "CL": ("Colgate-Palmolive", "Consumer Staples", "Household Products", 90.0),
    "KMB": ("Kimberly-Clark", "Consumer Staples", "Household Products", 128.0),
    "GIS": ("General Mills", "Consumer Staples", "Packaged Foods", 63.0),
    "K": ("Kellanova", "Consumer Staples", "Packaged Foods", 80.0),
    "HSY": ("The Hershey Company", "Consumer Staples", "Packaged Foods", 188.0),
    "MKC": ("McCormick & Company", "Consumer Staples", "Packaged Foods", 73.0),
    "SJM": ("J.M. Smucker", "Consumer Staples", "Packaged Foods", 112.0),
    "CAG": ("Conagra Brands", "Consumer Staples", "Packaged Foods", 27.0),
    "CPB": ("Campbell Soup Company", "Consumer Staples", "Packaged Foods", 42.0),
    "HRL": ("Hormel Foods", "Consumer Staples", "Packaged Foods", 30.0),
    "MNST": ("Monster Beverage", "Consumer Staples", "Soft Drinks", 52.0),
    "REYN": ("Reynolds Consumer Products", "Consumer Staples", "Household Products", 28.0),
    "CHD": ("Church & Dwight", "Consumer Staples", "Household Products", 100.0),
    "EL": ("Estee Lauder Companies", "Consumer Staples", "Personal Products", 107.0),
    "CLX": ("Clorox Company", "Consumer Staples", "Household Products", 141.0),
    "BG": ("Bunge Global", "Consumer Staples", "Agricultural Products", 95.0),
    "ADM": ("Archer-Daniels-Midland", "Consumer Staples", "Agricultural Products", 52.0),
    "TSN": ("Tyson Foods", "Consumer Staples", "Packaged Foods", 55.0),
    "KR": ("Kroger Company", "Consumer Staples", "Food Retail", 58.0),
    "SFM": ("Sprouts Farmers Market", "Consumer Staples", "Food Retail", 85.0),
    "COTY": ("Coty Inc.", "Consumer Staples", "Personal Products", 9.0),
    "PFGC": ("Performance Food Group", "Consumer Staples", "Food Distributors", 80.0),
    "STKL": ("SunOpta Inc.", "Consumer Staples", "Packaged Foods", 8.0),
    # Health Care
    "LLY": ("Eli Lilly and Company", "Health Care", "Pharmaceuticals", 750.0),
    "UNH": ("UnitedHealth Group", "Health Care", "Managed Health Care", 510.0),
    "JNJ": ("Johnson & Johnson", "Health Care", "Pharmaceuticals", 155.0),
    "ABBV": ("AbbVie Inc.", "Health Care", "Pharmaceuticals", 168.0),
    "MRK": ("Merck & Company", "Health Care", "Pharmaceuticals", 130.0),
    "TMO": ("Thermo Fisher Scientific", "Health Care", "Life Sciences Equipment", 570.0),
    "ABT": ("Abbott Laboratories", "Health Care", "Health Care Equipment", 108.0),
    "DHR": ("Danaher Corporation", "Health Care", "Life Sciences Equipment", 260.0),
    "BMY": ("Bristol-Myers Squibb", "Health Care", "Pharmaceuticals", 48.0),
    "AMGN": ("Amgen Inc.", "Health Care", "Biotechnology", 295.0),
    "GILD": ("Gilead Sciences", "Health Care", "Biotechnology", 75.0),
    "SYK": ("Stryker Corporation", "Health Care", "Health Care Equipment", 350.0),
    "MDT": ("Medtronic PLC", "Health Care", "Health Care Equipment", 88.0),
    "ELV": ("Elevance Health", "Health Care", "Managed Health Care", 495.0),
    "CI": ("The Cigna Group", "Health Care", "Managed Health Care", 340.0),
    "HUM": ("Humana Inc.", "Health Care", "Managed Health Care", 308.0),
    "CVS": ("CVS Health Corporation", "Health Care", "Health Care Services", 59.0),
    "VRTX": ("Vertex Pharmaceuticals", "Health Care", "Biotechnology", 455.0),
    "REGN": ("Regeneron Pharmaceuticals", "Health Care", "Biotechnology", 900.0),
    "ISRG": ("Intuitive Surgical", "Health Care", "Health Care Equipment", 410.0),
    "ZBH": ("Zimmer Biomet Holdings", "Health Care", "Health Care Equipment", 115.0),
    "EW": ("Edwards Lifesciences", "Health Care", "Health Care Equipment", 89.0),
    "BAX": ("Baxter International", "Health Care", "Health Care Equipment", 34.0),
    "BDX": ("Becton Dickinson", "Health Care", "Health Care Equipment", 228.0),
    "BSX": ("Boston Scientific", "Health Care", "Health Care Equipment", 82.0),
    "CAH": ("Cardinal Health", "Health Care", "Health Care Distributors", 114.0),
    "CNC": ("Centene Corporation", "Health Care", "Managed Health Care", 60.0),
    "COO": ("The Cooper Companies", "Health Care", "Health Care Equipment", 310.0),
    "DVA": ("DaVita Inc.", "Health Care", "Health Care Services", 140.0),
    "DXCM": ("DexCom Inc.", "Health Care", "Health Care Equipment", 72.0),
    "GEHC": ("GE HealthCare Technologies", "Health Care", "Health Care Equipment", 82.0),
    "HCA": ("HCA Healthcare", "Health Care", "Health Care Facilities", 310.0),
    "HOLX": ("Hologic Inc.", "Health Care", "Health Care Equipment", 70.0),
    "IQV": ("IQVIA Holdings", "Health Care", "Life Sciences Tools & Services", 215.0),
    "MCK": ("McKesson Corporation", "Health Care", "Health Care Distributors", 580.0),
    "MOH": ("Molina Healthcare", "Health Care", "Managed Health Care", 300.0),
    "MTD": ("Mettler-Toledo International", "Health Care", "Life Sciences Equipment", 1380.0),
    "RMD": ("ResMed Inc.", "Health Care", "Health Care Equipment", 215.0),
    "TECH": ("Bio-Techne Corporation", "Health Care", "Life Sciences Tools & Services", 70.0),
    "WAT": ("Waters Corporation", "Health Care", "Life Sciences Equipment", 340.0),
    "ZTS": ("Zoetis Inc.", "Health Care", "Pharmaceuticals", 168.0),
    "ALGN": ("Align Technology", "Health Care", "Health Care Equipment", 230.0),
    "A": ("Agilent Technologies", "Health Care", "Life Sciences Equipment", 118.0),
    "BIIB": ("Biogen Inc.", "Health Care", "Biotechnology", 195.0),
    "IDXX": ("IDEXX Laboratories", "Health Care", "Health Care Equipment", 465.0),
    "ABC": ("AmerisourceBergen", "Health Care", "Health Care Distributors", 225.0),
    "LH": ("Laboratory Corp. of America", "Health Care", "Health Care Services", 215.0),
    "DGX": ("Quest Diagnostics", "Health Care", "Health Care Services", 150.0),
    "INCY": ("Incyte Corporation", "Health Care", "Biotechnology", 54.0),
    "UTHR": ("United Therapeutics", "Health Care", "Biotechnology", 310.0),
    "PRGO": ("Perrigo Company", "Health Care", "Pharmaceuticals", 24.0),
    "STE": ("STERIS PLC", "Health Care", "Health Care Equipment", 225.0),
    "TDOC": ("Teladoc Health", "Health Care", "Health Care Technology", 11.0),
    "PKI": ("PerkinElmer", "Health Care", "Life Sciences Equipment", 130.0),
    "CRL": ("Charles River Laboratories", "Health Care", "Life Sciences Tools & Services", 175.0),
    "ELAN": ("Elanco Animal Health", "Health Care", "Pharmaceuticals", 12.0),
    "BIO": ("Bio-Rad Laboratories", "Health Care", "Life Sciences Equipment", 340.0),
    "ANTM": ("Anthem Inc.", "Health Care", "Managed Health Care", 490.0),
    "ATRC": ("AtriCure Inc.", "Health Care", "Health Care Equipment", 35.0),
    "GKOS": ("Glaukos Corporation", "Health Care", "Health Care Equipment", 90.0),
    "ICUI": ("ICU Medical", "Health Care", "Health Care Equipment", 140.0),
    "PDCO": ("Patterson Companies", "Health Care", "Health Care Distributors", 28.0),
    "SWAV": ("ShockWave Medical", "Health Care", "Health Care Equipment", 320.0),
    "TNDM": ("Tandem Diabetes Care", "Health Care", "Health Care Equipment", 25.0),
    "VCYT": ("Veracyte Inc.", "Health Care", "Biotechnology", 29.0),
    # Financials
    "JPM": ("JPMorgan Chase & Co.", "Financials", "Diversified Banks", 195.0),
    "V": ("Visa Inc.", "Financials", "Data Processing & Outsourced Services", 285.0),
    "MA": ("Mastercard Inc.", "Financials", "Data Processing & Outsourced Services", 490.0),
    "BAC": ("Bank of America", "Financials", "Diversified Banks", 39.0),
    "WFC": ("Wells Fargo & Company", "Financials", "Diversified Banks", 57.0),
    "GS": ("Goldman Sachs Group", "Financials", "Investment Banking & Brokerage", 475.0),
    "MS": ("Morgan Stanley", "Financials", "Investment Banking & Brokerage", 99.0),
    "SCHW": ("Charles Schwab", "Financials", "Investment Banking & Brokerage", 73.0),
    "BLK": ("BlackRock Inc.", "Financials", "Asset Management", 840.0),
    "AXP": ("American Express", "Financials", "Consumer Finance", 226.0),
    "USB": ("U.S. Bancorp", "Financials", "Diversified Banks", 44.0),
    "TFC": ("Truist Financial", "Financials", "Diversified Banks", 40.0),
    "PNC": ("PNC Financial Services", "Financials", "Diversified Banks", 166.0),
    "COF": ("Capital One Financial", "Financials", "Consumer Finance", 153.0),
    "C": ("Citigroup Inc.", "Financials", "Diversified Banks", 63.0),
    "STT": ("State Street Corporation", "Financials", "Asset Management", 77.0),
    "MTB": ("M&T Bank Corporation", "Financials", "Regional Banks", 170.0),
    "NTRS": ("Northern Trust Corporation", "Financials", "Asset Management", 96.0),
    "HBAN": ("Huntington Bancshares", "Financials", "Regional Banks", 15.0),
    "KEY": ("KeyCorp", "Financials", "Regional Banks", 16.0),
    "RF": ("Regions Financial", "Financials", "Regional Banks", 23.0),
    "CFG": ("Citizens Financial Group", "Financials", "Regional Banks", 36.0),
    "FITB": ("Fifth Third Bancorp", "Financials", "Regional Banks", 37.0),
    "BK": ("Bank of New York Mellon", "Financials", "Asset Management", 63.0),
    "DFS": ("Discover Financial Services", "Financials", "Consumer Finance", 198.0),
    "SYF": ("Synchrony Financial", "Financials", "Consumer Finance", 46.0),
    "ALLY": ("Ally Financial Inc.", "Financials", "Consumer Finance", 38.0),
    "NDAQ": ("Nasdaq Inc.", "Financials", "Financial Exchanges & Data", 68.0),
    "ICE": ("Intercontinental Exchange", "Financials", "Financial Exchanges & Data", 152.0),
    "CME": ("CME Group Inc.", "Financials", "Financial Exchanges & Data", 215.0),
    "CBOE": ("Cboe Global Markets", "Financials", "Financial Exchanges & Data", 185.0),
    "MKTX": ("MarketAxess Holdings", "Financials", "Financial Exchanges & Data", 230.0),
    "SPGI": ("S&P Global Inc.", "Financials", "Financial Exchanges & Data", 445.0),
    "MCO": ("Moody's Corporation", "Financials", "Financial Exchanges & Data", 405.0),
    "FDS": ("FactSet Research Systems", "Financials", "Financial Exchanges & Data", 420.0),
    "BRO": ("Brown & Brown Inc.", "Financials", "Insurance Brokers", 90.0),
    "WTW": ("Willis Towers Watson", "Financials", "Insurance Brokers", 270.0),
    "MMC": ("Marsh & McLennan Companies", "Financials", "Insurance Brokers", 225.0),
    "AON": ("Aon PLC", "Financials", "Insurance Brokers", 330.0),
    "MET": ("MetLife Inc.", "Financials", "Life & Health Insurance", 67.0),
    "PRU": ("Prudential Financial", "Financials", "Life & Health Insurance", 113.0),
    "UNM": ("Unum Group", "Financials", "Life & Health Insurance", 43.0),
    "AFL": ("Aflac Inc.", "Financials", "Life & Health Insurance", 100.0),
    "LNC": ("Lincoln National", "Financials", "Life & Health Insurance", 27.0),
    "HIG": ("The Hartford Financial", "Financials", "Multi-line Insurance", 99.0),
    "ALL": ("Allstate Corporation", "Financials", "Property & Casualty Insurance", 190.0),
    "PGR": ("Progressive Corporation", "Financials", "Property & Casualty Insurance", 250.0),
    "CB": ("Chubb Limited", "Financials", "Property & Casualty Insurance", 270.0),
    "TRV": ("The Travelers Companies", "Financials", "Property & Casualty Insurance", 218.0),
    "CNA": ("CNA Financial", "Financials", "Property & Casualty Insurance", 46.0),
    "CINF": ("Cincinnati Financial", "Financials", "Property & Casualty Insurance", 115.0),
    "GL": ("Globe Life Inc.", "Financials", "Life & Health Insurance", 97.0),
    "BRK-B": ("Berkshire Hathaway Class B", "Financials", "Multi-Sector Holdings", 395.0),
    "AJG": ("Arthur J. Gallagher & Co.", "Financials", "Insurance Brokers", 260.0),
    "ARES": ("Ares Management", "Financials", "Asset Management", 130.0),
    "CBRE": ("CBRE Group", "Financials", "Real Estate Services", 95.0),
    "TROW": ("T. Rowe Price Group", "Financials", "Asset Management", 105.0),
    "LPLA": ("LPL Financial Holdings", "Financials", "Investment Banking & Brokerage", 230.0),
    "SEIC": ("SEI Investments", "Financials", "Asset Management", 67.0),
    "PFG": ("Principal Financial Group", "Financials", "Life & Health Insurance", 82.0),
    "RJF": ("Raymond James Financial", "Financials", "Investment Banking & Brokerage", 128.0),
    "SQ": ("Block Inc.", "Financials", "Data Processing & Outsourced Services", 71.0),
    "IBKR": ("Interactive Brokers Group", "Financials", "Investment Banking & Brokerage", 118.0),
    "VOYA": ("Voya Financial", "Financials", "Life & Health Insurance", 68.0),
    "AIZ": ("Assurant Inc.", "Financials", "Multi-line Insurance", 175.0),
    "FAF": ("First American Financial", "Financials", "Property & Casualty Insurance", 58.0),
    "ERIE": ("Erie Indemnity Company", "Financials", "Property & Casualty Insurance", 355.0),
    "EWBC": ("East West Bancorp", "Financials", "Regional Banks", 77.0),
    "FHN": ("First Horizon Corporation", "Financials", "Regional Banks", 17.0),
    "GBCI": ("Glacier Bancorp", "Financials", "Regional Banks", 42.0),
    "HLI": ("Houlihan Lokey", "Financials", "Investment Banking & Brokerage", 135.0),
    "LAZ": ("Lazard Ltd.", "Financials", "Investment Banking & Brokerage", 42.0),
    "SNV": ("Synovus Financial", "Financials", "Regional Banks", 43.0),
    "WBS": ("Webster Financial", "Financials", "Regional Banks", 46.0),
    "BAH": ("Booz Allen Hamilton", "Financials", "Research & Consulting Services", 145.0),
    "CFR": ("Cullen/Frost Bankers", "Financials", "Regional Banks", 120.0),
    "AMG": ("Affiliated Managers Group", "Financials", "Asset Management", 145.0),
    "SIVB": ("SVB Financial Group", "Financials", "Regional Banks", 28.0),
    "FRC": ("First Republic Bank", "Financials", "Regional Banks", 15.0),
    "HOOD": ("Robinhood Markets", "Financials", "Investment Banking & Brokerage", 18.0),
    "BGCP": ("BGC Group", "Financials", "Financial Exchanges & Data", 7.0),
    "CIT": ("First Citizens BancShares", "Financials", "Regional Banks", 1950.0),
    "EEFT": ("Euronet Worldwide", "Financials", "Data Processing & Outsourced Services", 78.0),
    "GCMG": ("GCM Grosvenor", "Financials", "Asset Management", 12.0),
    "MFA": ("MFA Financial", "Financials", "Mortgage REITs", 12.0),
    "NYCB": ("New York Community Bancorp", "Financials", "Regional Banks", 10.0),
    "OFG": ("OFG Bancorp", "Financials", "Regional Banks", 32.0),
    "PIPR": ("Piper Sandler Companies", "Financials", "Investment Banking & Brokerage", 225.0),
    "RKT": ("Rocket Companies", "Financials", "Thrifts & Mortgage Finance", 13.0),
    "WSFS": ("WSFS Financial Corporation", "Financials", "Regional Banks", 46.0),
    "EV": ("Eaton Vance Corp", "Financials", "Asset Management", 80.0),
    "LKFN": ("Lakeland Bancorp", "Financials", "Regional Banks", 18.0),
    "PRIMERICA": ("Primerica Inc.", "Financials", "Life & Health Insurance", 245.0),
    # Industrials
    "GE": ("GE Aerospace", "Industrials", "Aerospace & Defense", 168.0),
    "CAT": ("Caterpillar Inc.", "Industrials", "Construction Machinery", 355.0),
    "HON": ("Honeywell International", "Industrials", "Industrial Conglomerates", 209.0),
    "DE": ("Deere & Company", "Industrials", "Agricultural & Farm Machinery", 398.0),
    "UPS": ("United Parcel Service", "Industrials", "Air Freight & Logistics", 138.0),
    "BA": ("Boeing Company", "Industrials", "Aerospace & Defense", 185.0),
    "RTX": ("RTX Corporation", "Industrials", "Aerospace & Defense", 116.0),
    "LMT": ("Lockheed Martin", "Industrials", "Aerospace & Defense", 490.0),
    "NOC": ("Northrop Grumman", "Industrials", "Aerospace & Defense", 490.0),
    "GD": ("General Dynamics", "Industrials", "Aerospace & Defense", 285.0),
    "MMM": ("3M Company", "Industrials", "Industrial Conglomerates", 116.0),
    "EMR": ("Emerson Electric", "Industrials", "Electrical Components", 108.0),
    "ETN": ("Eaton Corporation", "Industrials", "Electrical Components", 290.0),
    "ITW": ("Illinois Tool Works", "Industrials", "Industrial Machinery", 255.0),
    "PH": ("Parker-Hannifin", "Industrials", "Industrial Machinery", 570.0),
    "ROK": ("Rockwell Automation", "Industrials", "Electrical Components", 260.0),
    "DOV": ("Dover Corporation", "Industrials", "Industrial Machinery", 186.0),
    "IR": ("Ingersoll Rand", "Industrials", "Industrial Machinery", 78.0),
    "XYL": ("Xylem Inc.", "Industrials", "Industrial Machinery", 120.0),
    "OTIS": ("Otis Worldwide", "Industrials", "Industrial Machinery", 95.0),
    "CARR": ("Carrier Global", "Industrials", "Building Products", 68.0),
    "AME": ("AMETEK Inc.", "Industrials", "Electronic Equipment", 174.0),
    "FAST": ("Fastenal Company", "Industrials", "Trading Companies & Distributors", 71.0),
    "GWW": ("W.W. Grainger", "Industrials", "Trading Companies & Distributors", 1070.0),
    "MAS": ("Masco Corporation", "Industrials", "Building Products", 67.0),
    "NDSN": ("Nordson Corporation", "Industrials", "Industrial Machinery", 230.0),
    "PCAR": ("PACCAR Inc.", "Industrials", "Construction Machinery", 100.0),
    "PWR": ("Quanta Services", "Industrials", "Construction & Engineering", 278.0),
    "RSG": ("Republic Services", "Industrials", "Environmental Services", 198.0),
    "SWK": ("Stanley Black & Decker", "Industrials", "Industrial Machinery", 80.0),
    "TDG": ("TransDigm Group", "Industrials", "Aerospace & Defense", 1210.0),
    "TT": ("Trane Technologies", "Industrials", "Building Products", 265.0),
    "URI": ("United Rentals", "Industrials", "Trading Companies & Distributors", 670.0),
    "VRSK": ("Verisk Analytics", "Industrials", "Research & Consulting Services", 258.0),
    "WM": ("Waste Management", "Industrials", "Environmental Services", 210.0),
    "FDX": ("FedEx Corporation", "Industrials", "Air Freight & Logistics", 275.0),
    "UNP": ("Union Pacific Corporation", "Industrials", "Railroads", 238.0),
    "CTAS": ("Cintas Corporation", "Industrials", "Diversified Support Services", 175.0),
    "EXPD": ("Expeditors International", "Industrials", "Air Freight & Logistics", 118.0),
    "CHRW": ("C.H. Robinson Worldwide", "Industrials", "Air Freight & Logistics", 89.0),
    "JBHT": ("J.B. Hunt Transport", "Industrials", "Trucking", 170.0),
    "KNX": ("Knight-Swift Transportation", "Industrials", "Trucking", 55.0),
    "LSTR": ("Landstar System", "Industrials", "Trucking", 185.0),
    "XPO": ("XPO Inc.", "Industrials", "Air Freight & Logistics", 115.0),
    "SAIA": ("Saia Inc.", "Industrials", "Trucking", 400.0),
    "AGCO": ("AGCO Corporation", "Industrials", "Agricultural & Farm Machinery", 82.0),
    "AOS": ("A.O. Smith Corporation", "Industrials", "Building Products", 79.0),
    "AYI": ("Acuity Brands", "Industrials", "Electrical Components", 255.0),
    "BWXT": ("BWX Technologies", "Industrials", "Aerospace & Defense", 99.0),
    "EFX": ("Equifax Inc.", "Industrials", "Research & Consulting Services", 235.0),
    "HII": ("Huntington Ingalls Industries", "Industrials", "Aerospace & Defense", 255.0),
    "HWM": ("Howmet Aerospace", "Industrials", "Aerospace & Defense", 88.0),
    "JBL": ("Jabil Inc.", "Industrials", "Electronic Manufacturing Services", 125.0),
    "LII": ("Lennox International", "Industrials", "Building Products", 540.0),
    "OSK": ("Oshkosh Corporation", "Industrials", "Construction Machinery", 105.0),
    "RHI": ("Robert Half International", "Industrials", "Human Resource Services", 65.0),
    "RRX": ("Rexnord Corporation", "Industrials", "Industrial Machinery", 72.0),
    "TXT": ("Textron Inc.", "Industrials", "Aerospace & Defense", 72.0),
    "WAB": ("Wabtec Corporation", "Industrials", "Construction Machinery", 175.0),
    "DAL": ("Delta Air Lines", "Industrials", "Airlines", 47.0),
    "LUV": ("Southwest Airlines", "Industrials", "Airlines", 28.0),
    "ALK": ("Alaska Air Group", "Industrials", "Airlines", 48.0),
    "KBR": ("KBR Inc.", "Industrials", "Construction & Engineering", 65.0),
    "CW": ("Curtiss-Wright Corporation", "Industrials", "Aerospace & Defense", 270.0),
    "R": ("Ryder System", "Industrials", "Trucking", 118.0),
    "RBC": ("RBC Bearings", "Industrials", "Industrial Machinery", 258.0),
    "MSA": ("MSA Safety", "Industrials", "Industrial Machinery", 145.0),
    "J": ("Jacobs Solutions", "Industrials", "Construction & Engineering", 133.0),
    "INFO": ("IHS Markit", "Industrials", "Research & Consulting Services", 110.0),
    "CFX": ("Colfax Corporation", "Industrials", "Industrial Machinery", 45.0),
    "FELE": ("Franklin Electric", "Industrials", "Industrial Machinery", 93.0),
    "GFF": ("Griffon Corporation", "Industrials", "Building Products", 62.0),
    "TNC": ("Titan International", "Industrials", "Industrial Machinery", 12.0),
    "ACCO": ("ACCO Brands", "Industrials", "Office Services & Supplies", 6.0),
    "OSI": ("OSI Systems", "Industrials", "Electronic Equipment", 135.0),
    # Energy
    "XOM": ("Exxon Mobil Corporation", "Energy", "Integrated Oil & Gas", 110.0),
    "CVX": ("Chevron Corporation", "Energy", "Integrated Oil & Gas", 152.0),
    "COP": ("ConocoPhillips", "Energy", "Oil & Gas E&P", 112.0),
    "EOG": ("EOG Resources", "Energy", "Oil & Gas E&P", 129.0),
    "SLB": ("Schlumberger", "Energy", "Oil & Gas Equipment & Services", 46.0),
    "PXD": ("Pioneer Natural Resources", "Energy", "Oil & Gas E&P", 240.0),
    "MPC": ("Marathon Petroleum", "Energy", "Oil & Gas Refining & Marketing", 178.0),
    "PSX": ("Phillips 66", "Energy", "Oil & Gas Refining & Marketing", 141.0),
    "VLO": ("Valero Energy", "Energy", "Oil & Gas Refining & Marketing", 157.0),
    "HES": ("Hess Corporation", "Energy", "Oil & Gas E&P", 155.0),
    "OXY": ("Occidental Petroleum", "Energy", "Oil & Gas E&P", 56.0),
    "DVN": ("Devon Energy", "Energy", "Oil & Gas E&P", 44.0),
    "FANG": ("Diamondback Energy", "Energy", "Oil & Gas E&P", 195.0),
    "HAL": ("Halliburton Company", "Energy", "Oil & Gas Equipment & Services", 36.0),
    "BKR": ("Baker Hughes Company", "Energy", "Oil & Gas Equipment & Services", 35.0),
    "APA": ("APA Corporation", "Energy", "Oil & Gas E&P", 25.0),
    "MRO": ("Marathon Oil Corporation", "Energy", "Oil & Gas E&P", 26.0),
    "OKE": ("ONEOK Inc.", "Energy", "Oil & Gas Storage & Transportation", 80.0),
    "WMB": ("Williams Companies", "Energy", "Oil & Gas Storage & Transportation", 36.0),
    "KMI": ("Kinder Morgan", "Energy", "Oil & Gas Storage & Transportation", 19.0),
    "LNG": ("Cheniere Energy", "Energy", "Oil & Gas Storage & Transportation", 165.0),
    "CTRA": ("Coterra Energy", "Energy", "Oil & Gas E&P", 24.0),
    "EQT": ("EQT Corporation", "Energy", "Oil & Gas E&P", 36.0),
    "AR": ("Antero Resources", "Energy", "Oil & Gas E&P", 28.0),
    "CNX": ("CNX Resources", "Energy", "Oil & Gas E&P", 24.0),
    "AM": ("Antero Midstream", "Energy", "Oil & Gas Storage & Transportation", 15.0),
    "ET": ("Energy Transfer LP", "Energy", "Oil & Gas Storage & Transportation", 15.0),
    "ENB": ("Enbridge Inc.", "Energy", "Oil & Gas Storage & Transportation", 40.0),
    "TRGP": ("Targa Resources", "Energy", "Oil & Gas Storage & Transportation", 112.0),
    "WES": ("Western Midstream Partners", "Energy", "Oil & Gas Storage & Transportation", 37.0),
    "MPLX": ("MPLX LP", "Energy", "Oil & Gas Storage & Transportation", 42.0),
    "RRC": ("Range Resources", "Energy", "Oil & Gas E&P", 29.0),
    "SM": ("SM Energy", "Energy", "Oil & Gas E&P", 24.0),
    "CLB": ("Core Laboratories", "Energy", "Oil & Gas Equipment & Services", 21.0),
    "CVE": ("Cenovus Energy", "Energy", "Integrated Oil & Gas", 20.0),
    "HFC": ("HF Sinclair Corporation", "Energy", "Oil & Gas Refining & Marketing", 48.0),
    "DCP": ("DCP Midstream", "Energy", "Oil & Gas Storage & Transportation", 42.0),
    "ANDX": ("Andeavor Logistics", "Energy", "Oil & Gas Storage & Transportation", 20.0),
    "DKL": ("Delek Logistics Partners", "Energy", "Oil & Gas Storage & Transportation", 35.0),
    "ENBL": ("Enable Midstream Partners", "Energy", "Oil & Gas Storage & Transportation", 12.0),
    "NGL": ("NGL Energy Partners", "Energy", "Oil & Gas Storage & Transportation", 3.0),
    "PAA": ("Plains All American Pipeline", "Energy", "Oil & Gas Storage & Transportation", 16.0),
    "PAGP": ("Plains GP Holdings", "Energy", "Oil & Gas Storage & Transportation", 16.0),
    "PBFX": ("PBF Logistics LP", "Energy", "Oil & Gas Storage & Transportation", 21.0),
    "PSXP": ("Phillips 66 Partners", "Energy", "Oil & Gas Storage & Transportation", 38.0),
    "SBOW": ("SandRidge Permian Trust", "Energy", "Oil & Gas E&P", 2.5),
    # Materials
    "LIN": ("Linde PLC", "Materials", "Industrial Gases", 455.0),
    "APD": ("Air Products and Chemicals", "Materials", "Industrial Gases", 238.0),
    "ECL": ("Ecolab Inc.", "Materials", "Specialty Chemicals", 221.0),
    "SHW": ("Sherwin-Williams", "Materials", "Specialty Chemicals", 337.0),
    "NEM": ("Newmont Corporation", "Materials", "Gold", 39.0),
    "FCX": ("Freeport-McMoRan", "Materials", "Copper", 46.0),
    "NUE": ("Nucor Corporation", "Materials", "Steel", 152.0),
    "STLD": ("Steel Dynamics", "Materials", "Steel", 120.0),
    "RS": ("Reliance Steel & Aluminum", "Materials", "Steel", 290.0),
    "CF": ("CF Industries Holdings", "Materials", "Fertilizers & Agricultural Chemicals", 78.0),
    "MOS": ("The Mosaic Company", "Materials", "Fertilizers & Agricultural Chemicals", 29.0),
    "FMC": ("FMC Corporation", "Materials", "Fertilizers & Agricultural Chemicals", 60.0),
    "PPG": ("PPG Industries", "Materials", "Specialty Chemicals", 120.0),
    "VMC": ("Vulcan Materials", "Materials", "Construction Materials", 266.0),
    "MLM": ("Martin Marietta Materials", "Materials", "Construction Materials", 595.0),
    "ALB": ("Albemarle Corporation", "Materials", "Specialty Chemicals", 85.0),
    "DD": ("DuPont de Nemours", "Materials", "Specialty Chemicals", 71.0),
    "DOW": ("Dow Inc.", "Materials", "Commodity Chemicals", 47.0),
    "EMN": ("Eastman Chemical", "Materials", "Specialty Chemicals", 93.0),
    "IP": ("International Paper", "Materials", "Paper & Packaging", 46.0),
    "PKG": ("Packaging Corp. of America", "Materials", "Paper & Packaging", 205.0),
    "WRK": ("WestRock Company", "Materials", "Paper & Packaging", 38.0),
    "SEE": ("Sealed Air Corporation", "Materials", "Metal & Glass Containers", 30.0),
    "SON": ("Sonoco Products", "Materials", "Paper & Packaging", 48.0),
    "IFF": ("International Flavors", "Materials", "Specialty Chemicals", 80.0),
    "RPM": ("RPM International", "Materials", "Specialty Chemicals", 112.0),
    "OLN": ("Olin Corporation", "Materials", "Commodity Chemicals", 30.0),
    "MP": ("MP Materials", "Materials", "Diversified Metals & Mining", 18.0),
    "HUN": ("Huntsman Corporation", "Materials", "Specialty Chemicals", 17.0),
    "NGVT": ("Ingevity Corporation", "Materials", "Specialty Chemicals", 32.0),
    "TREX": ("Trex Company", "Materials", "Building Products", 72.0),
    "BCC": ("Boise Cascade", "Materials", "Paper & Packaging", 101.0),
    "KGC": ("Kinross Gold", "Materials", "Gold", 8.0),
    "CRS": ("Carpenter Technology", "Materials", "Steel", 80.0),
    "SLVM": ("Sylvamo Corporation", "Materials", "Paper & Packaging", 57.0),
    "UFPI": ("UFP Technologies", "Materials", "Paper & Packaging", 70.0),
    "BMS": ("Bemis Company", "Materials", "Metal & Glass Containers", 50.0),
    "GEF": ("Greif Inc.", "Materials", "Metal & Glass Containers", 65.0),
    "ATI": ("ATI Inc.", "Materials", "Steel", 54.0),
    "BALL": ("Ball Corporation", "Materials", "Metal & Glass Containers", 58.0),
    "ARNC": ("Arconic Corporation", "Materials", "Aluminum", 22.0),
    "SLGN": ("Silgan Holdings", "Materials", "Metal & Glass Containers", 46.0),
    "CEG": ("Constellation Energy", "Utilities", "Independent Power Producers", 220.0),
    "EXP": ("Eagle Materials", "Materials", "Construction Materials", 258.0),
    # Real Estate
    "PLD": ("Prologis Inc.", "Real Estate", "Industrial REITs", 121.0),
    "AMT": ("American Tower Corporation", "Real Estate", "Specialized REITs", 188.0),
    "CCI": ("Crown Castle Inc.", "Real Estate", "Specialized REITs", 100.0),
    "EQIX": ("Equinix Inc.", "Real Estate", "Specialized REITs", 800.0),
    "O": ("Realty Income Corporation", "Real Estate", "Retail REITs", 52.0),
    "PSA": ("Public Storage", "Real Estate", "Specialized REITs", 290.0),
    "SPG": ("Simon Property Group", "Real Estate", "Retail REITs", 158.0),
    "WELL": ("Welltower Inc.", "Real Estate", "Health Care REITs", 100.0),
    "DLR": ("Digital Realty Trust", "Real Estate", "Specialized REITs", 145.0),
    "VICI": ("VICI Properties", "Real Estate", "Specialized REITs", 28.0),
    "ARE": ("Alexandria Real Estate", "Real Estate", "Office REITs", 114.0),
    "AVB": ("AvalonBay Communities", "Real Estate", "Residential REITs", 212.0),
    "BXP": ("BXP Inc.", "Real Estate", "Office REITs", 68.0),
    "CPT": ("Camden Property Trust", "Real Estate", "Residential REITs", 112.0),
    "EQR": ("Equity Residential", "Real Estate", "Residential REITs", 66.0),
    "ESS": ("Essex Property Trust", "Real Estate", "Residential REITs", 270.0),
    "EXR": ("Extra Space Storage", "Real Estate", "Specialized REITs", 161.0),
    "FRT": ("Federal Realty Investment", "Real Estate", "Retail REITs", 103.0),
    "HST": ("Host Hotels & Resorts", "Real Estate", "Hotel & Resort REITs", 19.0),
    "IRM": ("Iron Mountain Inc.", "Real Estate", "Specialized REITs", 87.0),
    "KIM": ("Kimco Realty", "Real Estate", "Retail REITs", 21.0),
    "MAA": ("Mid-America Apartment", "Real Estate", "Residential REITs", 140.0),
    "NNN": ("NNN REIT", "Real Estate", "Retail REITs", 43.0),
    "PEAK": ("Healthpeak Properties", "Real Estate", "Health Care REITs", 17.0),
    "REG": ("Regency Centers", "Real Estate", "Retail REITs", 66.0),
    "SBA": ("SBA Communications", "Real Estate", "Specialized REITs", 205.0),
    "UDR": ("UDR Inc.", "Real Estate", "Residential REITs", 37.0),
    "VTR": ("Ventas Inc.", "Real Estate", "Health Care REITs", 45.0),
    "AIV": ("Apartment Investment", "Real Estate", "Residential REITs", 8.0),
    "AIRC": ("Apartment Income REIT", "Real Estate", "Residential REITs", 36.0),
    "ALEX": ("Alexander & Baldwin", "Real Estate", "Diversified REITs", 17.0),
    "APLE": ("Apple Hospitality REIT", "Real Estate", "Hotel & Resort REITs", 15.0),
    "DEA": ("Easterly Government Properties", "Real Estate", "Office REITs", 12.0),
    "EPRT": ("Essential Properties Realty", "Real Estate", "Retail REITs", 27.0),
    "GTY": ("Getty Realty", "Real Estate", "Retail REITs", 31.0),
    "IIPR": ("Innovative Industrial Properties", "Real Estate", "Industrial REITs", 99.0),
    "ILPT": ("Industrial Logistics Properties", "Real Estate", "Industrial REITs", 4.0),
    "LTC": ("LTC Properties", "Real Estate", "Health Care REITs", 35.0),
    "NSA": ("National Storage Affiliates", "Real Estate", "Specialized REITs", 37.0),
    "PDM": ("Piedmont Office Realty", "Real Estate", "Office REITs", 8.0),
    "ROIC": ("Retail Opportunity Investments", "Real Estate", "Retail REITs", 14.0),
    "SAFE": ("Saul Centers", "Real Estate", "Retail REITs", 53.0),
    "SKT": ("Tanger Factory Outlet Centers", "Real Estate", "Retail REITs", 31.0),
    "STAG": ("STAG Industrial", "Real Estate", "Industrial REITs", 36.0),
    "TRNO": ("Terreno Realty", "Real Estate", "Industrial REITs", 62.0),
    "COLD": ("Americold Realty Trust", "Real Estate", "Industrial REITs", 24.0),
    "KREF": ("KKR Real Estate Finance Trust", "Real Estate", "Mortgage REITs", 12.0),
    "BRSP": ("BrightSpire Capital", "Real Estate", "Mortgage REITs", 8.0),
    "BRT": ("BRT Realty Trust", "Real Estate", "Diversified REITs", 17.0),
    "CORR": ("CorEnergy Infrastructure Trust", "Real Estate", "Specialized REITs", 4.0),
    "GMRE": ("Global Medical REIT", "Real Estate", "Health Care REITs", 8.0),
    "STOR": ("STORE Capital", "Real Estate", "Retail REITs", 32.0),
    "INDUS": ("INDUS Realty Trust", "Real Estate", "Industrial REITs", 65.0),
    "JBGS": ("JBG SMITH Properties", "Real Estate", "Office REITs", 16.0),
    "MACK": ("Mack-Cali Realty", "Real Estate", "Office REITs", 11.0),
    "PW": ("Power REIT", "Real Estate", "Specialized REITs", 8.0),
    # Utilities
    "NEE": ("NextEra Energy", "Utilities", "Electric Utilities", 71.0),
    "DUK": ("Duke Energy Corporation", "Utilities", "Electric Utilities", 100.0),
    "SO": ("Southern Company", "Utilities", "Electric Utilities", 82.0),
    "D": ("Dominion Energy", "Utilities", "Multi-Utilities", 48.0),
    "AEP": ("American Electric Power", "Utilities", "Electric Utilities", 98.0),
    "EXC": ("Exelon Corporation", "Utilities", "Electric Utilities", 37.0),
    "SRE": ("Sempra Energy", "Utilities", "Multi-Utilities", 73.0),
    "XEL": ("Xcel Energy", "Utilities", "Electric Utilities", 65.0),
    "WEC": ("WEC Energy Group", "Utilities", "Electric Utilities", 85.0),
    "ES": ("Eversource Energy", "Utilities", "Electric Utilities", 57.0),
    "ED": ("Consolidated Edison", "Utilities", "Electric Utilities", 95.0),
    "ETR": ("Entergy Corporation", "Utilities", "Electric Utilities", 115.0),
    "FE": ("FirstEnergy Corp.", "Utilities", "Electric Utilities", 40.0),
    "PPL": ("PPL Corporation", "Utilities", "Electric Utilities", 28.0),
    "CNP": ("CenterPoint Energy", "Utilities", "Multi-Utilities", 28.0),
    "CMS": ("CMS Energy", "Utilities", "Multi-Utilities", 60.0),
    "AEE": ("Ameren Corporation", "Utilities", "Multi-Utilities", 82.0),
    "DTE": ("DTE Energy", "Utilities", "Multi-Utilities", 113.0),
    "EVRG": ("Evergy Inc.", "Utilities", "Electric Utilities", 54.0),
    "NI": ("NiSource Inc.", "Utilities", "Multi-Utilities", 28.0),
    "NRG": ("NRG Energy", "Utilities", "Independent Power Producers", 75.0),
    "OGE": ("OGE Energy", "Utilities", "Electric Utilities", 37.0),
    "PNW": ("Pinnacle West Capital", "Utilities", "Electric Utilities", 72.0),
    "POR": ("Portland General Electric", "Utilities", "Electric Utilities", 38.0),
}

# Score overrides for the 20 existing demo stocks
SCORE_OVERRIDES: dict[str, float] = {
    "MSFT": 91, "AAPL": 87, "V": 85, "MA": 84, "AVGO": 83,
    "GOOGL": 82, "COST": 80, "META": 79, "NVDA": 78, "AMZN": 76,
    "CRM": 74, "BRK-B": 73, "JPM": 72, "HD": 71, "UNH": 70,
    "JNJ": 68, "PG": 67, "ABBV": 66, "XOM": 65, "TSLA": 55,
}

# Sector-based score distribution params (mean, std)
SECTOR_SCORE_PARAMS: dict[str, tuple[float, float]] = {
    "Information Technology":  (70.0, 13.0),
    "Communication Services":  (64.0, 12.0),
    "Consumer Discretionary":  (62.0, 13.0),
    "Consumer Staples":        (60.0, 10.0),
    "Health Care":             (65.0, 12.0),
    "Financials":              (63.0, 11.0),
    "Industrials":             (64.0, 11.0),
    "Energy":                  (58.0, 13.0),
    "Materials":               (60.0, 11.0),
    "Real Estate":             (55.0, 11.0),
    "Utilities":               (54.0, 9.0),
}

# Sector daily volatility for price simulation
SECTOR_DAILY_VOL: dict[str, float] = {
    "Information Technology":  0.020,
    "Communication Services":  0.017,
    "Consumer Discretionary":  0.016,
    "Consumer Staples":        0.010,
    "Health Care":             0.013,
    "Financials":              0.014,
    "Industrials":             0.013,
    "Energy":                  0.020,
    "Materials":               0.015,
    "Real Estate":             0.012,
    "Utilities":               0.008,
}

THESES = {
    "MSFT": "Microsoft commands a dominant position across enterprise software, cloud infrastructure, and AI tooling. Azure's share gains in hyperscale compute, combined with Copilot monetization embedded in Office 365, create durable multi-year pricing power. Free cash flow conversion exceeds 35%, enabling aggressive buybacks without sacrificing R&D investment.",
    "AAPL": "Apple's services layer — App Store, Apple One, AppleCare, and financial products — now contributes over 22% of revenue at 70%+ gross margins, structurally lifting blended profitability. iPhone installed base loyalty exceeds 95% annual retention. The vision-compute roadmap and India manufacturing diversification reduce geopolitical tail risk.",
    "NVDA": "NVIDIA holds an estimated 80%+ share of AI accelerator compute, reinforced by the CUDA software moat that takes competitors years to replicate. Hopper and Blackwell architectures are sold out 12-18 months forward. Data center revenue has grown 4x year-over-year, and inference demand — often overlooked — is additive to training demand.",
    "META": "Meta's ad-targeting recovery post-ATT is complete, with Advantage+ AI-driven placements commanding 20-30% CPM premiums. Reels engagement drives incremental time-on-platform and is now monetizing at near-Feed levels. Llama open-source models attract developer ecosystems that reinforce the platform flywheel at minimal marginal cost.",
    "GOOGL": "Alphabet's Search monetization remains structurally protected by intent-based query targeting, even as AI Overviews expand. YouTube Premium and Google Cloud collectively represent a $100B+ revenue opportunity growing above 20% annually. Waymo's robotaxi commercialization in San Francisco and Phoenix is advancing faster than external estimates.",
    "AVGO": "Broadcom's VMware integration is ahead of schedule, with annualized cross-sell synergies tracking $4-5B above initial guidance. Custom ASIC designs for hyperscaler AI inference chips (Google TPUs, Meta's MTIA) provide a durable, long-cycle revenue stream insulated from NVIDIA pricing dynamics.",
    "V": "Visa's network-of-networks positioning captures payment volume irrespective of which bank or fintech issues the card. Cross-border volume — which carries 2-3x the yield of domestic transactions — is recovering to pre-pandemic trajectory as international travel normalizes. Tap-to-pay penetration in emerging markets represents a decade-long runway.",
    "MA": "Mastercard's value-added services segment — fraud analytics, open banking APIs, and cybersecurity tools — now represents 35% of net revenue and grows at 2x the network rate. This creates a consultative relationship with issuers and merchants that competitors cannot easily replicate on transaction economics alone.",
    "COST": "Costco's membership fee model generates ~$5B in nearly riskless annualized recurring revenue, subsidizing merchandise margins below competitors and creating a loyalty moat that drives 92% annual renewal rates. Membership fee increases pass through with minimal churn. International expansion (China, Europe) replicates the warehouse model into underpenetrated markets.",
    "LLY": "Eli Lilly's GLP-1 franchise (tirzepatide / Mounjaro / Zepbound) targets obesity and diabetes markets collectively exceeding $150B by 2030. Manufacturing capacity expansions in Ireland, Indiana, and Germany support a supply catch-up into 2025-2026. Pipeline depth in Alzheimer's (donanemab) and cancer indications provides optionality beyond metabolic disease.",
    "UNH": "UnitedHealth's Optum segment — combining pharmacy benefits, care delivery, and data analytics — generates higher-margin revenue than traditional insurance and reinforces a closed-loop health ecosystem difficult for pure-play payers to replicate. Medicare Advantage penetration continues rising, and Optum Care's provider footprint expands organically.",
    "AMZN": "Amazon Web Services sustains 17% growth on a $100B+ run-rate with margin expansion as the mix shifts toward higher-margin AI inference workloads and managed services. Advertising revenue — now $50B+ annualized — monetizes purchase intent at unmatched scale. Logistics network owned assets reduce third-party carrier dependency and structurally lower per-unit shipping costs.",
    "HD": "Home Depot's Pro contractor segment — representing 45-50% of sales — is stickier, higher-basket, and more defensible than DIY. The $18B SRS Distribution acquisition extends the Pro value chain into direct-to-jobsite distribution. Aging US housing stock and pent-up renovation demand underpin a multi-cycle spending tailwind.",
    "BKNG": "Booking Holdings' merchant model expansion — where it takes inventory risk in exchange for higher take rates — is structurally accretive to revenue quality. The Genius loyalty program now has 150M+ members and drives direct booking share that reduces OTA commission leakage. Attractions and ground transport integrations deepen the travel ecosystem.",
    "GWW": ("W.W. Grainger", "Industrials", "Trading Companies & Distributors", 1070.0),
}

THESIS_TEXTS = {
    "MSFT": THESES["MSFT"], "AAPL": THESES["AAPL"], "NVDA": THESES["NVDA"],
    "META": THESES["META"], "GOOGL": THESES["GOOGL"], "AVGO": THESES["AVGO"],
    "V": THESES["V"], "MA": THESES["MA"], "COST": THESES["COST"],
    "LLY": THESES["LLY"], "UNH": THESES["UNH"], "AMZN": THESES["AMZN"],
    "HD": THESES["HD"], "BKNG": THESES["BKNG"],
}


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def gauss_clamp(mean: float, std: float, lo: float, hi: float) -> float:
    return clamp(random.gauss(mean, std), lo, hi)


def trading_days(n: int, end: date | None = None) -> list[date]:
    """Return last n trading days (Mon-Fri) up to end date."""
    if end is None:
        end = date.today()
    days = []
    d = end
    while len(days) < n:
        if d.weekday() < 5:
            days.append(d)
        d -= timedelta(days=1)
    return list(reversed(days))


def score_to_quality(score: float) -> float:
    """Map 0-100 score to 0-1 quality (used for metric generation)."""
    return clamp((score - 30) / 65.0, 0.0, 1.0)


def compute_fundamental_score(
    rev_growth: float, eps_growth: float, fcf_yield: float,
    roe: float, gross_margin: float, debt_to_equity: float,
    fwd_pe: float, sector_pe: float,
) -> tuple[float, dict]:
    """Compute fundamental score (0-60) from metrics."""
    # FCF yield (0-12)
    if fcf_yield > 0.08:   fcf_pts = 12.0
    elif fcf_yield > 0.05: fcf_pts = 9.0
    elif fcf_yield > 0.03: fcf_pts = 6.0
    elif fcf_yield > 0.01: fcf_pts = 3.0
    else:                  fcf_pts = 0.0

    # ROE (0-10)
    if roe > 0.30:   roe_pts = 10.0
    elif roe > 0.20: roe_pts = 8.0
    elif roe > 0.15: roe_pts = 6.0
    elif roe > 0.10: roe_pts = 4.0
    elif roe > 0.05: roe_pts = 2.0
    else:            roe_pts = 0.0

    # Gross margin (0-10)
    if gross_margin > 0.60:   gm_pts = 10.0
    elif gross_margin > 0.40: gm_pts = 8.0
    elif gross_margin > 0.30: gm_pts = 6.0
    elif gross_margin > 0.20: gm_pts = 4.0
    else:                     gm_pts = 2.0

    # Rev growth (0-8)
    if rev_growth > 0.30:   rg_pts = 8.0
    elif rev_growth > 0.15: rg_pts = 6.0
    elif rev_growth > 0.05: rg_pts = 4.0
    elif rev_growth > 0.0:  rg_pts = 2.0
    else:                   rg_pts = 0.0

    # EPS growth (0-8)
    if eps_growth > 0.30:   eg_pts = 8.0
    elif eps_growth > 0.15: eg_pts = 6.0
    elif eps_growth > 0.05: eg_pts = 4.0
    elif eps_growth > 0.0:  eg_pts = 2.0
    else:                   eg_pts = 0.0

    # D/E (0-6)
    if debt_to_equity < 0.5:   de_pts = 6.0
    elif debt_to_equity < 1.0: de_pts = 5.0
    elif debt_to_equity < 2.0: de_pts = 3.0
    elif debt_to_equity < 3.0: de_pts = 1.0
    else:                      de_pts = 0.0

    # EPS revision (0-4) — always modest for dummy data
    eps_rev_pts = random.choice([0.0, 2.0, 4.0])

    # Fwd P/E vs sector (0-2)
    if fwd_pe > 0 and sector_pe > 0:
        ratio = fwd_pe / sector_pe
        fwd_pe_pts = 2.0 if ratio < 0.85 else (1.0 if ratio < 1.1 else 0.0)
    else:
        fwd_pe_pts = 1.0

    total = fcf_pts + roe_pts + gm_pts + rg_pts + eg_pts + de_pts + eps_rev_pts + fwd_pe_pts
    breakdown = {
        "fcf_yield_pts": fcf_pts,
        "roe_pts": roe_pts,
        "gross_margin_pts": gm_pts,
        "rev_growth_pts": rg_pts,
        "eps_growth_pts": eg_pts,
        "debt_equity_pts": de_pts,
        "eps_revision_pts": eps_rev_pts,
        "fwd_pe_pts": fwd_pe_pts,
    }
    return clamp(total, 0.0, 60.0), breakdown


def compute_technical_score(
    rsi: float, macd_status: str, pct_above_200ma: float,
    volume_status: str, from_52w_high: float,
) -> tuple[float, dict]:
    """Compute technical score (0-40) from signals."""
    # RSI (0-8)
    if 40 <= rsi <= 60:     rsi_pts = 8.0
    elif 30 <= rsi <= 70:   rsi_pts = 5.0
    else:                   rsi_pts = 2.0

    # MACD (0-8)
    macd_pts = {"bullish_crossover": 8.0, "above_signal": 5.0, "below_signal": 0.0, "unknown": 2.0}.get(macd_status, 2.0)

    # Above 200MA (0-8)
    if pct_above_200ma > 10.0:  ma_pts = 8.0
    elif pct_above_200ma > 5.0: ma_pts = 6.0
    elif pct_above_200ma > 0.0: ma_pts = 4.0
    elif pct_above_200ma > -5:  ma_pts = 2.0
    else:                       ma_pts = 0.0

    # Volume (0-8)
    vol_pts = {"bullish": 8.0, "neutral": 4.0, "bearish": 0.0}.get(volume_status, 4.0)

    # 52w high proximity (0-8) — avoid ceiling; reward healthy pullback
    from_high_pct = abs(from_52w_high) * 100
    if from_high_pct < 5:      h52_pts = 3.0   # too close, potential resistance
    elif from_high_pct < 15:   h52_pts = 8.0
    elif from_high_pct < 30:   h52_pts = 6.0
    else:                      h52_pts = 3.0

    total = rsi_pts + macd_pts + ma_pts + vol_pts + h52_pts
    breakdown = {
        "rsi_pts": rsi_pts,
        "macd_pts": macd_pts,
        "ma200_pts": ma_pts,
        "volume_pts": vol_pts,
        "high52w_pts": h52_pts,
        "earnings_penalty": 0.0,
    }
    return clamp(total, 0.0, 40.0), breakdown


def generate_stock(ticker: str, target_score: float | None = None) -> dict:
    """Generate a complete scan_result row for one ticker."""
    meta = TICKER_META.get(ticker)
    if meta:
        name, sector, industry, base_price = meta
    else:
        sector = "Information Technology"
        name = f"{ticker} Inc."
        industry = "Technology Hardware"
        base_price = 50.0

    mean_score, std_score = SECTOR_SCORE_PARAMS.get(sector, (62.0, 12.0))
    score = target_score if target_score is not None else gauss_clamp(mean_score, std_score, 28.0, 97.0)
    q = score_to_quality(score)

    # ── Fundamental metrics ──────────────────────────────────────
    # Quality-driven distributions
    rev_growth   = gauss_clamp(q * 0.30 - 0.02, 0.12, -0.15, 0.60)
    eps_growth   = gauss_clamp(q * 0.35 - 0.02, 0.15, -0.25, 0.80)
    fcf_yield    = gauss_clamp(q * 0.09 + 0.01, 0.025, -0.02, 0.15)
    roe          = gauss_clamp(q * 0.40 + 0.05, 0.10, 0.0, 0.90)
    gross_margin = gauss_clamp(q * 0.50 + 0.15, 0.12, 0.05, 0.90)
    debt_to_eq   = gauss_clamp((1.0 - q) * 3.0 + 0.2, 0.6, 0.0, 8.0)
    fwd_pe       = gauss_clamp(10 + q * 30, 6, 5, 80)
    trailing_pe  = fwd_pe * gauss_clamp(1.1, 0.15, 0.8, 1.6)
    sector_pe    = SECTOR_PE.get(sector, 20.0)
    analyst_tgt  = base_price * gauss_clamp(1.0 + q * 0.20, 0.06, 0.90, 1.50)
    p_to_s       = gauss_clamp(q * 8 + 0.5, 2, 0.2, 30)
    p_to_b       = gauss_clamp(q * 10 + 1.0, 3, 0.5, 30)
    ev_ebitda    = gauss_clamp(q * 25 + 5, 5, 3, 60)
    recent_cat   = random.choice([
        "Strong earnings beat", "Raised guidance", "New product launch",
        "Strategic acquisition", "Analyst upgrade", "Market share gains",
        "Margin expansion", "",
    ])

    # ── Technical signals ────────────────────────────────────────
    rsi           = gauss_clamp(30 + q * 35, 8, 22, 80)
    pct_above_200 = gauss_clamp(q * 18 - 3, 7, -20, 40)
    from_52w_high = gauss_clamp(-(1 - q) * 0.25, 0.08, -0.55, -0.01)
    macd_status   = random.choices(
        ["bullish_crossover", "above_signal", "below_signal", "unknown"],
        weights=[q * 30 + 5, q * 40 + 10, (1 - q) * 40 + 5, 5],
    )[0]
    volume_status = random.choices(
        ["bullish", "neutral", "bearish"],
        weights=[q * 50 + 10, 30, (1 - q) * 40 + 5],
    )[0]
    ma200 = base_price / (1 + pct_above_200 / 100.0)
    ma50  = base_price * gauss_clamp(1.0, 0.03, 0.90, 1.12)
    adx   = gauss_clamp(20 + q * 20, 8, 10, 60)
    obv_slope = gauss_clamp(q * 2.0 - 0.5, 1.0, -3.0, 5.0)
    roc20 = gauss_clamp(q * 15 - 3, 6, -20, 40)
    rs_vs_spy = gauss_clamp(q * 2.0 - 0.5, 0.8, -2.0, 4.0)

    # ── Scores ───────────────────────────────────────────────────
    f_score, f_breakdown = compute_fundamental_score(
        rev_growth, eps_growth, fcf_yield, roe, gross_margin, debt_to_eq, fwd_pe, sector_pe
    )
    t_score, t_breakdown = compute_technical_score(
        rsi, macd_status, pct_above_200, volume_status, from_52w_high
    )
    composite = round(clamp(f_score + t_score, 0, 100), 1)

    # Adjust price to reflect quality slightly
    price_factor = gauss_clamp(0.85 + q * 0.3, 0.08, 0.70, 1.30)
    current_price = round(base_price * price_factor, 2)
    annual_upside = (analyst_tgt / current_price - 1) * 100
    # 1-month target scales the annual analyst consensus to one month
    price_target_1m = round(current_price * (1 + annual_upside / 100.0 / 12), 2)
    upside = round((price_target_1m / current_price - 1) * 100, 1)

    # Earnings date: random in next 90 days
    days_out = random.randint(5, 90)
    earnings_date = (date.today() + timedelta(days=days_out)).isoformat()

    metrics = {
        "rev_growth": round(rev_growth, 4),
        "eps_growth": round(eps_growth, 4),
        "fcf_yield": round(fcf_yield, 4),
        "roe": round(roe, 4),
        "gross_margin": round(gross_margin, 4),
        "debt_to_equity": round(debt_to_eq, 3),
        "fwd_pe": round(fwd_pe, 2),
        "trailing_pe": round(trailing_pe, 2),
        "price_to_sales": round(p_to_s, 2),
        "price_to_book": round(p_to_b, 2),
        "ev_ebitda": round(ev_ebitda, 2),
        "sector_pe": sector_pe,
        "analyst_target": round(analyst_tgt, 2),
        "recent_catalyst": recent_cat,
        "market_cap": round(current_price * gauss_clamp(500e6, 200e6, 50e6, 3_000_000e6), 0),
        "week52_high": round(current_price / (1 + from_52w_high), 2),
        "week52_low": round(current_price * gauss_clamp(0.70, 0.08, 0.50, 0.90), 2),
    }

    signals = {
        "rsi": round(rsi, 1),
        "macd_status": macd_status,
        "pct_above_200ma": round(pct_above_200, 2),
        "from_52w_high": round(from_52w_high, 4),
        "volume_status": volume_status,
        "ma50": round(ma50, 2),
        "ma200": round(ma200, 2),
        "adx": round(adx, 1),
        "obv_slope_pct": round(obv_slope, 2),
        "roc_20": round(roc20, 2),
        "rs_vs_spy": round(rs_vs_spy, 3),
    }

    score_breakdown = {**f_breakdown, **t_breakdown}

    return {
        "ticker": ticker,
        "name": name,
        "sector": sector,
        "industry": industry,
        "score": composite,
        "fundamental_score": round(f_score, 1),
        "technical_score": round(t_score, 1),
        "current_price": current_price,
        "price_target_1m": price_target_1m,
        "upside_pct": upside,
        "score_breakdown_json": json.dumps(score_breakdown),
        "metrics_json": json.dumps(metrics),
        "signals_json": json.dumps(signals),
        "earnings_date": earnings_date,
        "data_source": "demo_data",
        "scanned_at": datetime.utcnow().isoformat(),
    }


SECTOR_PE: dict[str, float] = {
    "Information Technology": 28.0,
    "Communication Services": 22.0,
    "Consumer Discretionary": 24.0,
    "Consumer Staples": 20.0,
    "Health Care": 22.0,
    "Financials": 14.0,
    "Industrials": 21.0,
    "Energy": 12.0,
    "Materials": 17.0,
    "Real Estate": 35.0,
    "Utilities": 18.0,
}


def generate_price_history(ticker: str, current_price: float, sector: str, n_days: int = 252) -> list[tuple]:
    """Generate n_days of daily OHLCV bars via geometric random walk."""
    daily_vol = SECTOR_DAILY_VOL.get(sector, 0.015)
    annual_drift = 0.10
    daily_drift = annual_drift / 252

    days = trading_days(n_days)
    # Simulate backwards: start from a "past" price and walk to current
    start_price = current_price * math.exp(-(daily_drift + 0.5 * daily_vol ** 2) * n_days)
    price = start_price

    rows = []
    for d in days:
        daily_return = random.gauss(daily_drift, daily_vol)
        price *= math.exp(daily_return)
        open_ = price * gauss_clamp(1.0, 0.005, 0.98, 1.02)
        high = price * gauss_clamp(1.01, 0.004, 1.0, 1.04)
        low  = price * gauss_clamp(0.99, 0.004, 0.96, 1.0)
        close = price
        adj_close = close
        volume = int(gauss_clamp(5_000_000, 3_000_000, 100_000, 50_000_000))
        rows.append((ticker, d.isoformat(), round(open_, 2), round(high, 2), round(low, 2),
                     round(close, 2), round(adj_close, 2), volume, "demo_data"))
    return rows


# ─────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"Connecting to {DB_PATH}")
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # Clear existing demo data — thesis_cache must be cleared before scan_results
    # because its scoped DELETE subqueries scan_results for the ticker list.
    print("Clearing existing demo data...")
    cur.execute("DELETE FROM thesis_cache WHERE ticker IN (SELECT ticker FROM scan_results WHERE data_source = 'demo_data')")
    cur.execute("DELETE FROM scan_results WHERE data_source = 'demo_data'")
    cur.execute("DELETE FROM price_history WHERE source = 'demo_data'")
    cur.execute("DELETE FROM scan_runs WHERE triggered_by = 'seed_script'")
    con.commit()

    tickers = SP500_TICKERS
    print(f"Generating data for {len(tickers)} tickers...")

    scan_rows = []
    for ticker in tickers:
        target = SCORE_OVERRIDES.get(ticker)
        row = generate_stock(ticker, target_score=target)
        scan_rows.append(row)

    # Sort by score descending (scanner expects this ordering)
    scan_rows.sort(key=lambda r: r["score"], reverse=True)

    # Insert scan_results
    print(f"Inserting {len(scan_rows)} scan_results rows...")
    cur.executemany(
        """
        INSERT INTO scan_results
          (ticker, name, sector, industry, score, fundamental_score, technical_score,
           current_price, price_target_1m, upside_pct, score_breakdown_json,
           metrics_json, signals_json, earnings_date, data_source, scanned_at)
        VALUES
          (:ticker, :name, :sector, :industry, :score, :fundamental_score, :technical_score,
           :current_price, :price_target_1m, :upside_pct, :score_breakdown_json,
           :metrics_json, :signals_json, :earnings_date, :data_source, :scanned_at)
        """,
        scan_rows,
    )
    con.commit()

    # Insert price_history in batches
    ticker_prices = {r["ticker"]: (r["current_price"], r["sector"]) for r in scan_rows}
    print(f"Generating price_history for {len(tickers)} tickers (~{len(tickers) * 252} rows)...")

    batch: list[tuple] = []
    BATCH_SIZE = 5000
    total_price_rows = 0
    for i, ticker in enumerate(tickers):
        current_price, sector = ticker_prices.get(ticker, (50.0, "Information Technology"))
        rows = generate_price_history(ticker, current_price, sector, n_days=252)
        batch.extend(rows)
        total_price_rows += len(rows)

        if len(batch) >= BATCH_SIZE:
            cur.executemany(
                "INSERT OR IGNORE INTO price_history (ticker, date, open, high, low, close, adj_close, volume, source) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                batch,
            )
            con.commit()
            batch = []

        if (i + 1) % 50 == 0:
            print(f"  price_history: {i + 1}/{len(tickers)} tickers done...")

    if batch:
        cur.executemany(
            "INSERT OR IGNORE INTO price_history (ticker, date, open, high, low, close, adj_close, volume, source) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            batch,
        )
        con.commit()

    print(f"Inserted {total_price_rows} price_history rows.")

    # Insert thesis_cache for top 30 stocks by score
    print("Inserting thesis_cache for top stocks...")
    top30 = scan_rows[:30]
    thesis_rows = []
    for r in top30:
        t = r["ticker"]
        text = THESIS_TEXTS.get(t)
        if not text:
            text = (
                f"{r['name']} ({t}) demonstrates compelling fundamentals with a composite score of {r['score']}/100. "
                f"The company operates in the {r['sector']} sector with a {r['industry']} business model. "
                f"Strong revenue growth and healthy cash generation support the current valuation, "
                f"while technical momentum indicators confirm positive price action relative to the broader market. "
                f"Analyst consensus targets a {r['upside_pct']}% upside from current levels over the near term."
            )
        thesis_rows.append({
            "ticker": t,
            "thesis_text": text,
            "score_at_generation": r["score"],
            "generated_at": datetime.utcnow().isoformat(),
        })

    cur.executemany(
        "INSERT OR REPLACE INTO thesis_cache (ticker, thesis_text, score_at_generation, generated_at) "
        "VALUES (:ticker, :thesis_text, :score_at_generation, :generated_at)",
        thesis_rows,
    )
    con.commit()
    print(f"Inserted {len(thesis_rows)} thesis_cache rows.")

    # Insert scan_run record
    now = datetime.utcnow()
    cur.execute(
        "INSERT INTO scan_runs (started_at, completed_at, triggered_by, tickers_attempted, "
        "tickers_succeeded, tickers_failed, data_source) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            (now - timedelta(minutes=5)).isoformat(),
            now.isoformat(),
            "seed_script",
            len(tickers),
            len(tickers),
            0,
            "demo_data",
        ),
    )
    con.commit()

    con.close()
    print(f"\nDone! Seeded {len(scan_rows)} stocks, {total_price_rows} price bars, {len(thesis_rows)} theses.")
    print("Top 10 by score:")
    for r in scan_rows[:10]:
        print(f"  {r['ticker']:8s} {r['score']:5.1f}  ${r['current_price']:>10.2f}  {r['sector']}")


if __name__ == "__main__":
    main()
