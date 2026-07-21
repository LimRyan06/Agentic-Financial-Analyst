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

    # Define custom instructions for charting
    PREFIX = """
You are a highly skilled Financial Analyst Agent.
You have access to a pandas dataframe `df` containing the user's uploaded financial data.

If the user asks you to create a chart, plot, or visualize data:
1. Use matplotlib.pyplot (already available as plt)
2. Write Python code to generate the plot using `df`
3. Save it with: plt.savefig('static/chart.png', bbox_inches='tight')
4. Call plt.close() afterwards to free memory
5. End your response with this exact line: ![Chart](http://localhost:8080/static/chart.png)

CRITICAL INSTRUCTION: You MUST NOT output both an "Action" and a "Final Answer" in the same response. 
- If you need to run Python code, ONLY output the Thought and Action block. DO NOT include a Final Answer.
- If you are ready to give the final answer, ONLY output the Final Answer block. DO NOT include an Action.

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
        early_stopping_method="generate",
    )

    return agent_executor
