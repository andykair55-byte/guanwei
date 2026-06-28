"""Agent 基类定义"""
from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Any


class AgentInput(BaseModel):
    """Agent 输入基类"""
    pass


class AgentOutput(BaseModel):
    """Agent 输出基类"""
    success: bool
    data: Any = None
    error: str | None = None


class BaseAgent(ABC):
    """Agent 基类"""

    name: str

    @abstractmethod
    async def run(self, input_data: AgentInput) -> AgentOutput:
        """运行 Agent

        Args:
            input_data: Agent 输入数据

        Returns:
            Agent 输出结果
        """
        pass

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(name={self.name})>"
