"""
Extract data from Google Spreadsheet using Service Account credentials.
Supports Office .xlsx files stored in Google Drive / Google Sheets.
"""

import io
import os
import pandas as pd
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession

SERVICE_ACCOUNT_FILE = "ai-ecommerce-agent-513409-a77cc7a940b8.json"
SPREADSHEET_ID = "1P2ud7-Q95Od4myAisYoUWbbac0Y5JlnI"
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

def get_authorized_session(service_account_path: str = SERVICE_ACCOUNT_FILE) -> AuthorizedSession:
    """Creates an authenticated session using the service account credentials."""
    if not os.path.exists(service_account_path):
        raise FileNotFoundError(f"Credentials file '{service_account_path}' not found.")
    
    credentials = service_account.Credentials.from_service_account_file(
        service_account_path, scopes=SCOPES
    )
    return AuthorizedSession(credentials)

def fetch_google_sheets_data(spreadsheet_id: str = SPREADSHEET_ID, save_path: str = "products_synced.xlsx") -> dict[str, pd.DataFrame]:
    """
    Downloads the spreadsheet in XLSX format and returns a dictionary of DataFrames for each sheet.
    Optionally saves the full workbook to disk.
    """
    session = get_authorized_session()
    export_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=xlsx"
    
    print(f"Connecting to Google Sheets (ID: {spreadsheet_id})...")
    response = session.get(export_url)
    
    if response.status_code != 200:
        raise RuntimeError(f"Failed to fetch document. HTTP Status: {response.status_code}, Response: {response.text[:300]}")
    
    # Save the downloaded binary to file if requested
    if save_path:
        with open(save_path, "wb") as f:
            f.write(response.content)
        print(f"Saved complete workbook to '{save_path}'.")
        
    excel_file = pd.ExcelFile(io.BytesIO(response.content))
    sheets_data = {}
    
    for sheet_name in excel_file.sheet_names:
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        sheets_data[sheet_name] = df
        print(f"Loaded '{sheet_name}': {df.shape[0]} rows, {df.shape[1]} columns.")
        
    return sheets_data

if __name__ == "__main__":
    sheets = fetch_google_sheets_data()
    for name, df in sheets.items():
        print(f"\n--- {name} Sample Data ---")
        print(df.head())

