"""
Redis 缓存服务层
用于热点数据缓存，提升 API 响应速度
"""
import os
import json
from typing import Optional, Any
from datetime import datetime

# Redis 连接（可选依赖）
try:
    import redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    REDIS_AVAILABLE = True
except ImportError:
    redis_client = None
    REDIS_AVAILABLE = False
    print("Warning: Redis not available, caching disabled")


class CacheService:
    """缓存服务"""

    # 缓存键前缀
    PREFIX_MELON_LIST = "melon:list"
    PREFIX_MELON_DETAIL = "melon:detail"
    PREFIX_USER_POINTS = "user:points"
    PREFIX_USER_INFO = "user:info"
    PREFIX_RANK_CONFIG = "rank:config"

    # 默认 TTL（秒）
    TTL_MELON_LIST = 300      # 5分钟
    TTL_USER_POINTS = 60      # 1分钟
    TTL_USER_INFO = 300       # 5分钟
    TTL_RANK_CONFIG = 0       # 永久（静态数据）

    def __init__(self):
        self.client = redis_client
        self.available = REDIS_AVAILABLE

    def _make_key(self, prefix: str, *args) -> str:
        """生成缓存键"""
        parts = [prefix] + [str(arg) for arg in args]
        return ":".join(parts)

    def get(self, key: str) -> Optional[Any]:
        """获取缓存"""
        if not self.available:
            return None
        try:
            value = self.client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None

    def set(self, key: str, value: Any, ttl: int = 0) -> bool:
        """设置缓存"""
        if not self.available:
            return False
        try:
            serialized = json.dumps(value, default=str)
            if ttl > 0:
                self.client.setex(key, ttl, serialized)
            else:
                self.client.set(key, serialized)
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False

    def delete(self, key: str) -> bool:
        """删除缓存"""
        if not self.available:
            return False
        try:
            self.client.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False

    def delete_pattern(self, pattern: str) -> bool:
        """删除匹配的缓存键"""
        if not self.available:
            return False
        try:
            keys = self.client.keys(pattern)
            if keys:
                self.client.delete(*keys)
            return True
        except Exception as e:
            print(f"Cache delete_pattern error: {e}")
            return False

    # === 业务方法 ===

    def get_melon_list(self, category: Optional[str] = None) -> Optional[list]:
        """获取瓜田列表缓存"""
        key = self._make_key(self.PREFIX_MELON_LIST, category or "all")
        return self.get(key)

    def set_melon_list(self, melons: list, category: Optional[str] = None) -> bool:
        """设置瓜田列表缓存"""
        key = self._make_key(self.PREFIX_MELON_LIST, category or "all")
        return self.set(key, melons, self.TTL_MELON_LIST)

    def get_melon_detail(self, melon_id: str) -> Optional[dict]:
        """获取瓜详情缓存"""
        key = self._make_key(self.PREFIX_MELON_DETAIL, melon_id)
        return self.get(key)

    def set_melon_detail(self, melon_id: str, melon: dict) -> bool:
        """设置瓜详情缓存"""
        key = self._make_key(self.PREFIX_MELON_DETAIL, melon_id)
        return self.set(key, melon, self.TTL_MELON_LIST)

    def get_user_points(self, user_id: str) -> Optional[int]:
        """获取用户积分缓存"""
        key = self._make_key(self.PREFIX_USER_POINTS, user_id)
        value = self.get(key)
        return value if value is not None else None

    def set_user_points(self, user_id: str, points: int) -> bool:
        """设置用户积分缓存"""
        key = self._make_key(self.PREFIX_USER_POINTS, user_id)
        return self.set(key, points, self.TTL_USER_POINTS)

    def invalidate_user_points(self, user_id: str) -> bool:
        """失效用户积分缓存（积分变动后调用）"""
        key = self._make_key(self.PREFIX_USER_POINTS, user_id)
        return self.delete(key)

    def get_user_info(self, user_id: str) -> Optional[dict]:
        """获取用户信息缓存"""
        key = self._make_key(self.PREFIX_USER_INFO, user_id)
        return self.get(key)

    def set_user_info(self, user_id: str, user: dict) -> bool:
        """设置用户信息缓存"""
        key = self._make_key(self.PREFIX_USER_INFO, user_id)
        return self.set(key, user, self.TTL_USER_INFO)

    def invalidate_user_info(self, user_id: str) -> bool:
        """失效用户信息缓存"""
        key = self._make_key(self.PREFIX_USER_INFO, user_id)
        return self.delete(key)

    def get_rank_config(self) -> Optional[list]:
        """获取段位配置缓存"""
        return self.get(self.PREFIX_RANK_CONFIG)

    def set_rank_config(self, ranks: list) -> bool:
        """设置段位配置缓存（永久）"""
        return self.set(self.PREFIX_RANK_CONFIG, ranks, self.TTL_RANK_CONFIG)


# 全局缓存服务实例
cache_service = CacheService()


def get_cache() -> CacheService:
    """获取缓存服务实例"""
    return cache_service