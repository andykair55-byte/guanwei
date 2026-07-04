"""
猜瓜流程集成测试
测试完整猜瓜业务流程
"""
import pytest


class TestMelonCRUDFlow:
    """瓜的创建和查询流程测试"""

    def test_create_melon_success(self, client, auth_headers, test_user):
        """测试创建瓜成功"""
        response = client.post(
            "/api/v1/melons",
            headers=auth_headers,
            json={
                "title": "测试创建的瓜",
                "description": "这是一个测试创建的瓜的描述",
                "category": "娱乐",
                "cover_image": ""
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "测试创建的瓜"
        assert data["category"] == "娱乐"
        assert data["creator_id"] == test_user.id
        assert data["status"] == "pending"
        assert data["participant_count"] == 0

    def test_get_melon_list(self, client, test_melon):
        """测试查询瓜列表成功"""
        response = client.get("/api/v1/melons")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert isinstance(data["items"], list)
        assert data["total"] >= 1

    def test_get_melon_detail(self, client, test_melon):
        """测试查询瓜详情成功"""
        response = client.get(f"/api/v1/melons/{test_melon.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_melon.id
        assert data["title"] == test_melon.title
        assert "description" in data

    def test_get_nonexistent_melon(self, client):
        """测试查询不存在的瓜返回404"""
        response = client.get("/api/v1/melons/99999")
        assert response.status_code == 404


class TestGuessFlow:
    """猜瓜流程测试"""

    def test_guess_without_login(self, client, test_melon):
        """测试未登录猜瓜返回401"""
        response = client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            json={
                "melon_id": test_melon.id,
                "choice": True
            }
        )
        assert response.status_code == 401

    def test_first_guess_success(self, client, auth_headers, test_melon, test_user):
        """测试首次猜瓜成功（选择真）"""
        response = client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            headers=auth_headers,
            json={
                "melon_id": test_melon.id,
                "choice": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["melon_id"] == test_melon.id
        assert data["choice"] is True
        assert "id" in data

    def test_duplicate_guess(self, client, auth_headers, test_melon):
        """测试重复猜瓜返回400"""
        client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            headers=auth_headers,
            json={
                "melon_id": test_melon.id,
                "choice": True
            }
        )
        response = client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            headers=auth_headers,
            json={
                "melon_id": test_melon.id,
                "choice": False
            }
        )
        assert response.status_code == 400

    def test_guess_nonexistent_melon(self, client, auth_headers):
        """测试猜不存在的瓜返回404"""
        response = client.post(
            "/api/v1/melons/99999/guess",
            headers=auth_headers,
            json={
                "melon_id": 99999,
                "choice": True
            }
        )
        assert response.status_code == 404

    def test_guess_updates_user_stats(self, client, auth_headers, test_melon, test_user, db_session):
        """测试猜瓜后用户统计更新（total_guesses +1）"""
        initial_guesses = test_user.total_guesses

        response = client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            headers=auth_headers,
            json={
                "melon_id": test_melon.id,
                "choice": True
            }
        )
        assert response.status_code == 200

        db_session.refresh(test_user)
        assert test_user.total_guesses == initial_guesses + 1

    def test_get_my_guess(self, client, auth_headers, test_melon):
        """测试查询我的猜瓜记录正确"""
        client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            headers=auth_headers,
            json={
                "melon_id": test_melon.id,
                "choice": True
            }
        )
        response = client.get(
            f"/api/v1/melons/{test_melon.id}/my-guess",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "guess" in data
        assert data["guess"] is not None
        assert data["guess"]["choice"] is True

    def test_get_my_guess_without_guess(self, client, auth_headers, test_melon):
        """测试未猜瓜时查询我的猜瓜记录返回None"""
        response = client.get(
            f"/api/v1/melons/{test_melon.id}/my-guess",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["guess"] is None


class TestEvidenceFlow:
    """佐证流程测试"""

    def test_submit_evidence_with_guess(self, client, auth_headers, test_melon, test_user):
        """测试提交佐证成功，积分+5"""
        initial_points = test_user.points

        response = client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            headers=auth_headers,
            json={
                "melon_id": test_melon.id,
                "choice": True,
                "evidence_content": "这是我的佐证内容，提供了相关证据"
            }
        )
        assert response.status_code == 200

        me_resp = client.get("/api/v1/users/me", headers=auth_headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["points"] == initial_points + 5

    def test_upvote_evidence_success(self, client, auth_headers, test_melon, test_user, test_user2, db_session):
        """测试佐证点赞成功，作者积分+2"""
        client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            headers=auth_headers,
            json={
                "melon_id": test_melon.id,
                "choice": True,
                "evidence_content": "这是用户1的佐证"
            }
        )

        evidences_resp = client.get(f"/api/v1/melons/{test_melon.id}/evidences")
        assert evidences_resp.status_code == 200
        evidences_data = evidences_resp.json()
        assert len(evidences_data["list"]) > 0
        evidence_id = evidences_data["list"][0]["id"]

        login2_resp = client.post(
            "/api/v1/users/login",
            json={"username": "testuser2", "password": "test123456"}
        )
        token2 = login2_resp.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}

        initial_author_points = test_user.points

        upvote_resp = client.post(
            f"/api/v1/melons/evidences/{evidence_id}/upvote",
            headers=headers2
        )
        assert upvote_resp.status_code == 200
        assert upvote_resp.json()["success"] is True

        db_session.refresh(test_user)
        assert test_user.points == initial_author_points + 2

    def test_get_evidence_list(self, client, test_melon, auth_headers):
        """测试查询佐证列表正确"""
        client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            headers=auth_headers,
            json={
                "melon_id": test_melon.id,
                "choice": True,
                "evidence_content": "测试佐证内容"
            }
        )

        response = client.get(f"/api/v1/melons/{test_melon.id}/evidences")
        assert response.status_code == 200
        data = response.json()
        assert "list" in data
        assert isinstance(data["list"], list)
        assert len(data["list"]) >= 1


class TestRevealedMelonFlow:
    """已开奖瓜的流程测试"""

    def test_guess_revealed_melon_correct(self, client, auth_headers, revealed_melon, test_user, db_session):
        """测试已开奖的瓜猜对后积分+30，段位更新"""
        initial_points = test_user.points
        initial_correct = test_user.correct_guesses

        response = client.post(
            f"/api/v1/melons/{revealed_melon.id}/guess",
            headers=auth_headers,
            json={
                "melon_id": revealed_melon.id,
                "choice": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is True
        assert data["points_earned"] == 30

        db_session.refresh(test_user)
        assert test_user.points == initial_points + 30
        assert test_user.correct_guesses == initial_correct + 1

    def test_guess_revealed_melon_wrong(self, client, auth_headers, revealed_melon, test_user, db_session):
        """测试已开奖的瓜猜错后不加分"""
        initial_points = test_user.points
        initial_correct = test_user.correct_guesses

        response = client.post(
            f"/api/v1/melons/{revealed_melon.id}/guess",
            headers=auth_headers,
            json={
                "melon_id": revealed_melon.id,
                "choice": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is False
        assert data["points_earned"] == 0

        db_session.refresh(test_user)
        assert test_user.points == initial_points
        assert test_user.correct_guesses == initial_correct


class TestCompleteGuessFlow:
    """完整猜瓜流程测试"""

    def test_complete_guess_flow(self, client, test_user, test_user2):
        """测试完整猜瓜业务流程"""
        login_resp = client.post(
            "/api/v1/users/login",
            json={"username": "testuser", "password": "test123456"}
        )
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        create_resp = client.post(
            "/api/v1/melons",
            headers=headers,
            json={
                "title": "完整流程测试瓜",
                "description": "这是一个用于完整流程测试的瓜",
                "category": "科技",
                "cover_image": ""
            }
        )
        assert create_resp.status_code == 200
        melon_id = create_resp.json()["id"]

        list_resp = client.get("/api/v1/melons")
        assert list_resp.status_code == 200
        assert list_resp.json()["total"] >= 1

        detail_resp = client.get(f"/api/v1/melons/{melon_id}")
        assert detail_resp.status_code == 200
        assert detail_resp.json()["title"] == "完整流程测试瓜"

        no_auth_resp = client.post(
            f"/api/v1/melons/{melon_id}/guess",
            json={"melon_id": melon_id, "choice": True}
        )
        assert no_auth_resp.status_code == 401

        guess_resp = client.post(
            f"/api/v1/melons/{melon_id}/guess",
            headers=headers,
            json={
                "melon_id": melon_id,
                "choice": True,
                "evidence_content": "我认为这是真的，因为有相关证据支持"
            }
        )
        assert guess_resp.status_code == 200

        dup_resp = client.post(
            f"/api/v1/melons/{melon_id}/guess",
            headers=headers,
            json={"melon_id": melon_id, "choice": False}
        )
        assert dup_resp.status_code == 400

        my_guess_resp = client.get(
            f"/api/v1/melons/{melon_id}/my-guess",
            headers=headers
        )
        assert my_guess_resp.status_code == 200
        assert my_guess_resp.json()["guess"] is not None

        evidences_resp = client.get(f"/api/v1/melons/{melon_id}/evidences")
        assert evidences_resp.status_code == 200
        assert len(evidences_resp.json()["list"]) >= 1

        stats_resp = client.get("/api/v1/users/me/stats", headers=headers)
        assert stats_resp.status_code == 200
        assert stats_resp.json()["total_guesses"] >= 1
