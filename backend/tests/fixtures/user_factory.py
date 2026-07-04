"""
用户测试数据工厂
生成各种段位、积分状态的测试用户数据（纯字典，不依赖数据库）
"""
from datetime import datetime
from ranks import RANK_CONFIG, calculate_rank


def create_test_user(username="testuser", **kwargs):
    """创建测试用户字典

    Args:
        username: 用户名
        **kwargs: 覆盖默认字段的参数

    Returns:
        dict: 用户数据字典
    """
    default_user = {
        "id": 1,
        "username": username,
        "nickname": "测试用户",
        "password_hash": "hashed_password",
        "avatar": f"https://picsum.photos/seed/{username}/80/80",
        "points": 100,
        "rank": "吃瓜群众",
        "is_admin": False,
        "total_guesses": 0,
        "correct_guesses": 0,
        "created_at": datetime.utcnow(),
    }
    default_user.update(kwargs)
    return default_user


def create_new_user(username="newuser"):
    """创建新注册用户（0次参与，100积分）

    Args:
        username: 用户名

    Returns:
        dict: 新用户数据
    """
    return create_test_user(
        username=username,
        points=100,
        rank="吃瓜群众",
        total_guesses=0,
        correct_guesses=0,
    )


def create_user_at_rank(rank_name, username=None):
    """创建刚好达到指定段位的用户（临界值）

    Args:
        rank_name: 段位名称
        username: 用户名（可选）

    Returns:
        dict: 用户数据
    """
    if rank_name not in RANK_CONFIG:
        raise ValueError(f"未知段位: {rank_name}")

    config = RANK_CONFIG[rank_name]
    min_correct = config["min_correct"]
    min_total = config["min_total"]
    min_accuracy = config["min_accuracy"]

    if min_total == 0:
        correct_guesses = 0
        total_guesses = 0
    else:
        correct_guesses = max(min_correct, int(min_total * min_accuracy))
        if correct_guesses / min_total < min_accuracy:
            correct_guesses += 1
        total_guesses = min_total

    if username is None:
        username = f"user_{rank_name}"

    return create_test_user(
        username=username,
        rank=rank_name,
        total_guesses=total_guesses,
        correct_guesses=correct_guesses,
    )


def create_user_below_rank(rank_name, username=None):
    """创建差一点达到指定段位的用户（低于临界值）

    Args:
        rank_name: 段位名称
        username: 用户名（可选）

    Returns:
        dict: 用户数据
    """
    if rank_name not in RANK_CONFIG:
        raise ValueError(f"未知段位: {rank_name}")

    config = RANK_CONFIG[rank_name]
    min_correct = config["min_correct"]
    min_total = config["min_total"]
    min_accuracy = config["min_accuracy"]

    if min_total == 0:
        return create_new_user(username or "user_below")

    correct_guesses = min_correct - 1 if min_correct > 0 else 0
    total_guesses = min_total - 1 if min_total > 0 else 0

    if total_guesses <= 0:
        total_guesses = 1
        correct_guesses = 0

    actual_rank = calculate_rank(correct_guesses, total_guesses)

    if username is None:
        username = f"user_below_{rank_name}"

    return create_test_user(
        username=username,
        rank=actual_rank,
        total_guesses=total_guesses,
        correct_guesses=correct_guesses,
    )


def create_user_with_points(points, username="points_user"):
    """创建指定积分的用户

    Args:
        points: 积分数量
        username: 用户名

    Returns:
        dict: 用户数据
    """
    return create_test_user(
        username=username,
        points=points,
    )


def create_admin_user(username="admin"):
    """创建管理员用户

    Args:
        username: 用户名

    Returns:
        dict: 管理员用户数据
    """
    return create_test_user(
        username=username,
        nickname="管理员",
        is_admin=True,
        points=9999,
        rank="见微先知",
        total_guesses=1500,
        correct_guesses=900,
    )


def create_all_rank_users():
    """创建所有段位的用户列表（用于批量测试）

    Returns:
        list[dict]: 所有段位的用户列表
    """
    users = []
    for rank_name in RANK_CONFIG.keys():
        user = create_user_at_rank(rank_name, username=f"user_{rank_name}")
        users.append(user)
    return users
