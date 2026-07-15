def test_list_results_no_auth(client, db):
    response = client.get("/api/results")
    assert response.status_code == 401


def test_list_results_empty(client, db, auth_headers):
    response = client.get("/api/results", headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] == 0
    assert data["results"] == []


def test_get_result_not_found(client, db, auth_headers):
    response = client.get(
        "/api/results/nonexistent-id", headers=auth_headers
    )
    assert response.status_code == 404


def test_delete_result_not_found(client, db, auth_headers):
    response = client.delete(
        "/api/results/nonexistent-id", headers=auth_headers
    )
    assert response.status_code == 404


def test_list_results_pagination(client, db, auth_headers):
    response = client.get(
        "/api/results?page=1&per_page=5", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "results" in data
    assert "total" in data
    assert "page" in data
    assert "per_page" in data
