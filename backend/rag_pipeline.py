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
DB_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://admin:adminpassword@localhost:5432/financial_agent_db")

def parse_excel_to_documents(file_path: str):
    """
    Parses an Excel file into a list of LangChain Documents.
    This is useful for reading financial datasets.
    """
    print(f"Parsing Excel file: {file_path}")
    # Load all sheets into a dictionary of DataFrames
    sheets = pd.read_excel(file_path, sheet_name=None)
    documents = []
    
    for sheet_name, df in sheets.items():
        # Clean the dataframe (drop empty rows/cols)
        df = df.dropna(how='all').dropna(axis=1, how='all')
        
        # Convert each row into a string representation for the LLM to understand
        # We create a 'content' column that merges all row data
        df['page_content'] = df.apply(lambda row: " | ".join([f"{col}: {val}" for col, val in row.items() if pd.notna(val)]), axis=1)
        
        # Add metadata so the agent knows which sheet/file this came from
        df['sheet_name'] = sheet_name
        df['source_file'] = os.path.basename(file_path)
        
        loader = DataFrameLoader(df, page_content_column="page_content")
        sheet_docs = loader.load()
        documents.extend(sheet_docs)
        
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
