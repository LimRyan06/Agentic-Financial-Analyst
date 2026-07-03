import os
import pandas as pd
from typing import List, Dict
from langchain_community.document_loaders import DataFrameLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_postgres.vectorstores import PGVector
from dotenv import load_dotenv

load_dotenv()

# We will use Ollama with a small embedding model like 'nomic-embed-text' or 'llama3'
EMBEDDING_MODEL = "nomic-embed-text" 
DB_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://admin:adminpassword@localhost:5433/financial_agent_db")

def parse_file_to_documents(file_path: str):
    """
    Parses an Excel (.xlsx/.xls) or CSV file into a list of LangChain Documents.
    """
    ext = os.path.splitext(file_path)[1].lower()
    documents = []

    if ext == ".csv":
        print(f"Parsing CSV file: {file_path}")
        df = pd.read_csv(file_path)
        df = df.dropna(how='all').dropna(axis=1, how='all')
        df['page_content'] = df.apply(
            lambda row: " | ".join([f"{col}: {val}" for col, val in row.items() if pd.notna(val)]), axis=1
        )
        df['sheet_name'] = "Sheet1"
        df['source_file'] = os.path.basename(file_path)
        loader = DataFrameLoader(df, page_content_column="page_content")
        documents.extend(loader.load())
    else:
        print(f"Parsing Excel file: {file_path}")
        sheets = pd.read_excel(file_path, sheet_name=None)
        for sheet_name, df in sheets.items():
            df = df.dropna(how='all').dropna(axis=1, how='all')
            df['page_content'] = df.apply(
                lambda row: " | ".join([f"{col}: {val}" for col, val in row.items() if pd.notna(val)]), axis=1
            )
            df['sheet_name'] = sheet_name
            df['source_file'] = os.path.basename(file_path)
            loader = DataFrameLoader(df, page_content_column="page_content")
            documents.extend(loader.load())

    print(f"Extracted {len(documents)} rows as documents.")
    return documents

def get_vector_store():
    """
    Initializes and returns the PGVector database connection.
    """
    embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
    
    vector_store = PGVector(
        embeddings=embeddings,
        collection_name="financial_docs",
        connection=DB_URL,
        use_jsonb=True,
    )
    return vector_store

def ingest_documents(documents: List):
    """
    Chunks documents and stores them in the vector database.
    """
    # Chunk the documents to fit well within LLM context limits
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunked_docs = text_splitter.split_documents(documents)
    
    print(f"Split into {len(chunked_docs)} chunks. Generating embeddings and storing in pgvector...")
    
    vector_store = get_vector_store()
    vector_store.add_documents(chunked_docs)
    
    print("Successfully ingested documents into the Vector DB.")
