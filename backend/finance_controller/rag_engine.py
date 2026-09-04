"""
RAG Evidence Engine
-------------------

SQLite:
    - document metadata
    - chunks
    - retrieval cache
    - audit-friendly evidence records

ChromaDB:
    - semantic vector search

The RAG layer does NOT make financial decisions.
It only retrieves evidence.

Financial decisions remain in:
    deterministic_engine.py
    control_scorer.py
    reasoning.py
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import chromadb


# -------------------------------------------------------------------
# CONFIGURATION
# -------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"
RAG_DIR = DATA_DIR / "rag"

SQLITE_PATH = RAG_DIR / "finance_controller.db"
CHROMA_PATH = RAG_DIR / "chroma"

RAG_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_PATH.mkdir(parents=True, exist_ok=True)


# -------------------------------------------------------------------
# SQLITE
# -------------------------------------------------------------------

def get_db_connection() -> sqlite3.Connection:
    """
    Create a SQLite connection.

    SQLite is used for:
        - document registry
        - chunks
        - retrieval cache
        - audit trail
    """

    conn = sqlite3.connect(str(SQLITE_PATH))

    conn.row_factory = sqlite3.Row

    return conn


def initialize_sqlite() -> None:
    """
    Create the RAG database schema.
    """

    conn = get_db_connection()

    cursor = conn.cursor()

    cursor.executescript(
        """
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id TEXT UNIQUE NOT NULL,
            filename TEXT NOT NULL,
            document_type TEXT,
            asset_id TEXT,
            vendor TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chunk_id TEXT UNIQUE NOT NULL,
            document_id TEXT NOT NULL,
            page_number INTEGER,
            chunk_index INTEGER,
            text TEXT NOT NULL,
            metadata_json TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(document_id)
                REFERENCES documents(document_id)
        );

        CREATE TABLE IF NOT EXISTS retrieval_cache (
            query_hash TEXT PRIMARY KEY,
            query TEXT NOT NULL,
            result_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS retrieval_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id TEXT,
            query TEXT NOT NULL,
            results_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )

    conn.commit()
    conn.close()


# -------------------------------------------------------------------
# CHROMADB
# -------------------------------------------------------------------

def get_chroma_collection():
    """
    Return the persistent ChromaDB collection.
    """

    client = chromadb.PersistentClient(
        path=str(CHROMA_PATH)
    )

    collection = client.get_or_create_collection(
        name="finance_controller_evidence",
        metadata={
            "description": (
                "Evidence store for vehicle liquidation "
                "finance controller"
            )
        }
    )

    return collection


# -------------------------------------------------------------------
# TEXT UTILITIES
# -------------------------------------------------------------------

def normalize_text(text: str) -> str:
    """
    Basic text cleanup before chunking.
    """

    if not text:
        return ""

    text = text.replace("\x00", " ")

    text = re.sub(r"\s+", " ", text)

    return text.strip()


def chunk_text(
    text: str,
    chunk_size: int = 800,
    overlap: int = 120
) -> List[str]:
    """
    Split text into overlapping chunks.

    Character-based chunking is intentionally simple for a hackathon.
    """

    text = normalize_text(text)

    if not text:
        return []

    if overlap >= chunk_size:
        raise ValueError(
            "overlap must be smaller than chunk_size"
        )

    chunks = []

    start = 0

    while start < len(text):

        end = start + chunk_size

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        start = end - overlap

    return chunks


def make_id(*parts: str) -> str:
    """
    Generate deterministic IDs.
    """

    raw = "::".join(str(p) for p in parts)

    return hashlib.sha256(
        raw.encode("utf-8")
    ).hexdigest()


def hash_query(query: str) -> str:
    return hashlib.sha256(
        query.strip().lower().encode("utf-8")
    ).hexdigest()


# -------------------------------------------------------------------
# DOCUMENT REGISTRATION
# -------------------------------------------------------------------

def register_document(
    document_id: str,
    filename: str,
    document_type: str = "unknown",
    asset_id: Optional[str] = None,
    vendor: Optional[str] = None
) -> None:

    conn = get_db_connection()

    conn.execute(
        """
        INSERT OR REPLACE INTO documents
        (
            document_id,
            filename,
            document_type,
            asset_id,
            vendor,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            document_id,
            filename,
            document_type,
            asset_id,
            vendor,
            datetime.utcnow().isoformat()
        )
    )

    conn.commit()
    conn.close()


# -------------------------------------------------------------------
# INDEX DOCUMENT
# -------------------------------------------------------------------

def index_document(
    document_id: str,
    filename: str,
    text: str,
    document_type: str = "unknown",
    asset_id: Optional[str] = None,
    vendor: Optional[str] = None
) -> Dict[str, Any]:
    """
    Chunk and index a document.

    Stores:
        SQLite -> metadata + text
        Chroma -> embeddings + metadata
    """

    initialize_sqlite()

    register_document(
        document_id=document_id,
        filename=filename,
        document_type=document_type,
        asset_id=asset_id,
        vendor=vendor
    )

    chunks = chunk_text(text)

    if not chunks:
        return {
            "success": False,
            "document_id": document_id,
            "chunks_indexed": 0,
            "message": "No text extracted from document."
        }

    collection = get_chroma_collection()

    conn = get_db_connection()

    chroma_ids = []
    documents = []
    metadatas = []

    for index, chunk in enumerate(chunks):

        chunk_id = make_id(
            document_id,
            str(index),
            chunk
        )

        metadata = {
            "document_id": document_id,
            "filename": filename,
            "document_type": document_type,
            "asset_id": asset_id or "",
            "vendor": vendor or "",
            "chunk_index": index,
            "page_number": index + 1
        }

        # SQLite
        conn.execute(
            """
            INSERT OR REPLACE INTO chunks
            (
                chunk_id,
                document_id,
                page_number,
                chunk_index,
                text,
                metadata_json,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                chunk_id,
                document_id,
                index + 1,
                index,
                chunk,
                json.dumps(metadata),
                datetime.utcnow().isoformat()
            )
        )

        # ChromaDB
        chroma_ids.append(chunk_id)
        documents.append(chunk)
        metadatas.append(metadata)

    conn.commit()
    conn.close()

    # ChromaDB upsert makes re-indexing safe.
    collection.upsert(
        ids=chroma_ids,
        documents=documents,
        metadatas=metadatas
    )

    return {
        "success": True,
        "document_id": document_id,
        "filename": filename,
        "chunks_indexed": len(chunks)
    }


# -------------------------------------------------------------------
# CACHE
# -------------------------------------------------------------------

def get_cached_result(query: str) -> Optional[List[Dict[str, Any]]]:
    """
    CAG-style retrieval cache.

    Repeated queries avoid another vector search.
    """

    query_hash = hash_query(query)

    conn = get_db_connection()

    row = conn.execute(
        """
        SELECT result_json
        FROM retrieval_cache
        WHERE query_hash = ?
        """,
        (query_hash,)
    ).fetchone()

    conn.close()

    if not row:
        return None

    try:
        return json.loads(row["result_json"])
    except json.JSONDecodeError:
        return None


def save_cached_result(
    query: str,
    results: List[Dict[str, Any]]
) -> None:

    query_hash = hash_query(query)

    conn = get_db_connection()

    conn.execute(
        """
        INSERT OR REPLACE INTO retrieval_cache
        (
            query_hash,
            query,
            result_json,
            created_at
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            query_hash,
            query,
            json.dumps(results),
            datetime.utcnow().isoformat()
        )
    )

    conn.commit()
    conn.close()


# -------------------------------------------------------------------
# RETRIEVAL
# -------------------------------------------------------------------

def retrieve_evidence(
    query: str,
    asset_id: Optional[str] = None,
    top_k: int = 5,
    use_cache: bool = True
) -> Dict[str, Any]:
    """
    Retrieve relevant evidence from ChromaDB.

    Returns a structured evidence package suitable for
    reasoning.py and the frontend.
    """

    initialize_sqlite()

    query = normalize_text(query)

    if not query:
        return {
            "query": query,
            "results": [],
            "cache_hit": False
        }

    # ---------------------------------------------------------------
    # CAG CACHE
    # ---------------------------------------------------------------

    if use_cache:

        cached = get_cached_result(query)

        if cached is not None:

            return {
                "query": query,
                "results": cached,
                "cache_hit": True,
                "source": "sqlite_cache"
            }

    # ---------------------------------------------------------------
    # CHROMA RETRIEVAL
    # ---------------------------------------------------------------

    collection = get_chroma_collection()

    where = None

    if asset_id:
        where = {
            "asset_id": asset_id
        }

    try:

        result = collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where
        )

    except Exception as exc:

        return {
            "query": query,
            "results": [],
            "cache_hit": False,
            "error": str(exc)
        }

    # ---------------------------------------------------------------
    # NORMALIZE RESULTS
    # ---------------------------------------------------------------

    evidence = []

    documents = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]

    for index, document in enumerate(documents):

        metadata = (
            metadatas[index]
            if index < len(metadatas)
            else {}
        )

        distance = (
            distances[index]
            if index < len(distances)
            else None
        )

        evidence.append(
            {
                "rank": index + 1,
                "text": document,
                "document_id": metadata.get(
                    "document_id"
                ),
                "filename": metadata.get(
                    "filename"
                ),
                "document_type": metadata.get(
                    "document_type"
                ),
                "asset_id": metadata.get(
                    "asset_id"
                ),
                "page_number": metadata.get(
                    "page_number"
                ),
                "similarity_distance": distance
            }
        )

    # ---------------------------------------------------------------
    # CACHE
    # ---------------------------------------------------------------

    if use_cache:
        save_cached_result(
            query=query,
            results=evidence
        )

    # ---------------------------------------------------------------
    # AUDIT
    # ---------------------------------------------------------------

    conn = get_db_connection()

    conn.execute(
        """
        INSERT INTO retrieval_audit
        (
            asset_id,
            query,
            results_json,
            created_at
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            asset_id,
            query,
            json.dumps(evidence),
            datetime.utcnow().isoformat()
        )
    )

    conn.commit()
    conn.close()

    return {
        "query": query,
        "results": evidence,
        "cache_hit": False,
        "source": "chromadb"
    }


# -------------------------------------------------------------------
# POLICY EXTRACTION
# -------------------------------------------------------------------

def extract_policy_reserve(
    evidence: Dict[str, Any]
) -> Optional[float]:
    """
    Attempt to extract a reserve amount from retrieved policy text.

    Example supported text:

        "Minimum reserve price is ₹54,000"

        "Reserve price: 54000"

    This is intentionally conservative.

    The LLM should NOT be trusted to invent financial numbers.
    """

    for item in evidence.get("results", []):

        text = item.get("text", "")

        patterns = [
            r"reserve\s+price[^\d₹]*₹?\s*([\d,]+)",
            r"minimum\s+reserve[^\d₹]*₹?\s*([\d,]+)",
            r"reserve[^\d₹]*₹?\s*([\d,]+)"
        ]

        for pattern in patterns:

            match = re.search(
                pattern,
                text,
                flags=re.IGNORECASE
            )

            if match:

                value = match.group(1)

                value = value.replace(",", "")

                try:
                    return float(value)
                except ValueError:
                    continue

    return None


# -------------------------------------------------------------------
# ASSET EVIDENCE
# -------------------------------------------------------------------

def build_asset_evidence(
    asset_id: str,
    outstanding_balance: float,
    target_liquidation: float
) -> Dict[str, Any]:
    """
    Build the RAG query for a liquidation asset.

    This creates the bridge between the deterministic controller
    and the document knowledge base.
    """

    query = f"""
    Vehicle liquidation evidence for asset {asset_id}.
    Outstanding balance: ₹{outstanding_balance}.
    Target liquidation amount: ₹{target_liquidation}.
    Find valuation evidence, auction reserve policy,
    liquidation policy, sale documentation, and any
    evidence explaining whether the target sale amount
    is financially justified.
    """

    retrieved = retrieve_evidence(
        query=query,
        asset_id=asset_id,
        top_k=5
    )

    policy_reserve = extract_policy_reserve(
        retrieved
    )

    retrieved["policy_reserve"] = policy_reserve

    return retrieved


# -------------------------------------------------------------------
# HUMAN-READABLE EVIDENCE
# -------------------------------------------------------------------

def format_evidence_for_llm(
    evidence: Dict[str, Any]
) -> str:
    """
    Convert retrieved evidence into a grounded context block
    for Ollama.

    Only retrieved text is included.
    """

    lines = []

    for item in evidence.get("results", []):

        lines.append(
            f"""
SOURCE: {item.get('filename')}
DOCUMENT TYPE: {item.get('document_type')}
PAGE: {item.get('page_number')}
ASSET: {item.get('asset_id')}

EVIDENCE:
{item.get('text')}
"""
        )

    return "\n".join(lines)


# -------------------------------------------------------------------
# STARTUP
# -------------------------------------------------------------------

initialize_sqlite()