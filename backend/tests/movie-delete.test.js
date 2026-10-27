import assert from "node:assert/strict";
import { describe, it, mock, afterEach } from "node:test";
import { deleteMovie } from "../src/modules/movies/movie.controller.js";
import * as movieService from "../src/modules/movies/movie.service.js";

function createMockRes() {
  let statusCode = 200;
  let responseBody = null;
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseBody = data;
      return this;
    },
    getStatusCode: () => statusCode,
    getBody: () => responseBody,
  };
}

describe("Movie Deletion API & Controller", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns 400 when movieId is not a valid UUID", async () => {
    const req = { params: { id: "not-a-valid-uuid" } };
    const res = createMockRes();
    let nextCalled = false;

    await deleteMovie(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.getStatusCode(), 400);
    assert.equal(res.getBody().success, false);
    assert.equal(res.getBody().message, "Invalid movie ID");
  });

  it("returns 404 when movie to delete does not exist", async () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const req = { params: { id: validUuid } };
    const res = createMockRes();
    let nextCalled = false;

    mock.method(movieService, "removeMovieById", async () => null);

    await deleteMovie(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.getStatusCode(), 404);
    assert.equal(res.getBody().success, false);
    assert.equal(res.getBody().message, "Movie not found");
  });

  it("returns 200 with deleted movie when deletion succeeds", async () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const req = { params: { id: validUuid } };
    const res = createMockRes();
    let nextCalled = false;

    const mockDeletedMovie = {
      id: validUuid,
      title: "Interstellar",
      durationMinutes: 169,
      language: "English",
    };

    mock.method(movieService, "removeMovieById", async () => mockDeletedMovie);

    await deleteMovie(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.getStatusCode(), 200);
    assert.equal(res.getBody().success, true);
    assert.equal(res.getBody().message, "Movie deleted successfully");
    assert.deepEqual(res.getBody().movie, mockDeletedMovie);
  });

  it("returns 409 Conflict when movie has active showtimes referencing it (code 23503)", async () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const req = { params: { id: validUuid } };
    const res = createMockRes();
    let nextCalled = false;

    mock.method(movieService, "removeMovieById", async () => {
      const err = new Error("update or delete on table \"movies\" violates foreign key constraint");
      err.code = "23503";
      throw err;
    });

    await deleteMovie(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.getStatusCode(), 409);
    assert.equal(res.getBody().success, false);
    assert.match(res.getBody().message, /active showtimes/i);
  });
});
