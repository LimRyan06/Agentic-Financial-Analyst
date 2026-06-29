from langchain_community.chat_models import ChatOllama
from langchain.tools.retriever import create_retriever_tool
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from .rag_pipeline import get_vector_store

# 1. Initialize the Local LLM (Llama 3 via Ollama)
llm = ChatOllama(model="llama3", temperature=0)

# 2. Create the RAG Tool
def create_financial_agent():
    vector_store = get_vector_store()
    retriever = vector_store.as_retriever(search_kwargs={"k": 5})
    
    retriever_tool = create_retriever_tool(
        retriever,
        "financial_document_search",
        "Search for information about financial data, reconciliation reports, and Excel spreadsheet contents. Use this to answer questions about the uploaded data."
    )
    
    tools = [retriever_tool]
    
    # 3. Define the Agent's Persona (System Prompt)
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a highly skilled Financial Analyst and Data Reconciliation Agent. 
        Your job is to assist users in comparing datasets, finding discrepancies, and summarizing financial reports.
        Always use the provided 'financial_document_search' tool to look up data before answering.
        Be professional, concise, and highlight any anomalies clearly.
        """),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    
    # 4. Create the Agent
    # Since Llama 3 on Ollama supports tool calling, we use the standard tool calling agent
    agent = create_tool_calling_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
    
    return agent_executor
