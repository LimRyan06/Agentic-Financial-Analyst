import os
import pandas as pd
from langchain_ollama import ChatOllama
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
from langchain_classic.agents.agent_types import AgentType

# 1. Initialize the Local LLM (Llama 3 via Ollama)
llm = ChatOllama(
    model="llama3",
    temperature=0,
    base_url="http://127.0.0.1:11434",
)

# 2. Create the Pandas DataFrame Agent
def create_financial_agent():
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir) or not os.listdir(uploads_dir):
        raise Exception("No data files have been uploaded yet. Please upload a CSV or Excel file first.")

    # Get the latest uploaded file
    files = [
        os.path.join(uploads_dir, f)
        for f in os.listdir(uploads_dir)
        if f.endswith((".csv", ".xlsx", ".xls"))
    ]
    if not files:
        raise Exception("No valid Excel or CSV files found in uploads.")

    latest_file = max(files, key=os.path.getmtime)

    # Load into pandas
    if latest_file.endswith(".csv"):
        df = pd.read_csv(latest_file, on_bad_lines="skip")
    else:
        df = pd.read_excel(latest_file)

    print(f"Loaded file: {latest_file} with {len(df)} rows and {len(df.columns)} columns")
    print(f"Columns: {list(df.columns)}")

    PREFIX = """
You are a highly skilled Financial Analyst Agent.
You have access to a pandas dataframe `df` containing the user's uploaded financial data.

If the user asks you to create a chart, plot, or visualize data:
1. You MUST use the `python_repl_ast` tool to execute Python code.
2. Your Python code MUST include:
   import matplotlib.pyplot as plt
   # ... (your plotting code here)
   plt.savefig('static/chart.png', bbox_inches='tight')
   plt.close()
3. ONLY AFTER the `python_repl_ast` tool successfully executes, output your Final Answer.
4. Your Final Answer MUST include: ![Chart](http://localhost:8080/static/chart.png)

CRITICAL INSTRUCTION: You MUST NOT output both an "Action" and a "Final Answer" in the same response. 
- To run Python code, ONLY output the Thought, Action, and Action Input blocks. DO NOT include a Final Answer.
- ONLY output a Final Answer when you are completely finished.

Always explore the dataframe first with df.head(), df.dtypes, or df.describe() if needed.
Answer questions professionally, accurately, and concisely.
    """

    # 3. Create the Agent using ZERO_SHOT_REACT_DESCRIPTION which works with local Ollama LLMs
    agent_executor = create_pandas_dataframe_agent(
        llm,
        df,
        verbose=True,
        allow_dangerous_code=True,
        agent_type=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        prefix=PREFIX,
        handle_parsing_errors=True,
        max_iterations=8,
    )

    return agent_executor
