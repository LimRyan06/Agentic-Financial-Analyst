import os
import pandas as pd
from langchain_ollama import ChatOllama
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent

# 1. Initialize the Local LLM (Llama 3 via Ollama)
llm = ChatOllama(model="llama3", temperature=0)

# 2. Create the Pandas DataFrame Agent
def create_financial_agent():
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir) or not os.listdir(uploads_dir):
        raise Exception("No data files have been uploaded yet. Please upload a CSV or Excel file.")
        
    # Get the latest uploaded file
    files = [os.path.join(uploads_dir, f) for f in os.listdir(uploads_dir) if f.endswith(('.csv', '.xlsx', '.xls'))]
    if not files:
        raise Exception("No valid Excel or CSV files found in uploads.")
        
    latest_file = max(files, key=os.path.getmtime)
    
    # Load into pandas
    if latest_file.endswith('.csv'):
        df = pd.read_csv(latest_file, on_bad_lines='skip')
    else:
        df = pd.read_excel(latest_file)
        
    # Define custom instructions for charting
    PREFIX = """
You are a highly skilled Financial Analyst Agent.
You have access to a pandas dataframe `df` containing the user's uploaded financial data.

If the user asks you to create a chart, plot, or graph:
1. Import matplotlib.pyplot as plt
2. Write the code to generate the plot based on `df`
3. Save the plot strictly to 'static/chart.png' using plt.savefig('static/chart.png')
4. Include this exact markdown string in your final response: ![Chart](http://localhost:8080/static/chart.png)

Ensure you clean the data if necessary before plotting. Answer questions professionally and accurately.
    """
    
    # 3. Create the Agent
    # allow_dangerous_code=True is required for the pandas agent to execute python code locally
    agent_executor = create_pandas_dataframe_agent(
        llm,
        df,
        verbose=True,
        allow_dangerous_code=True,
        prefix=PREFIX,
        handle_parsing_errors=True
    )
    
    return agent_executor
