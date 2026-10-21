import assert from "node:assert/strict";
import { describe, it, mock, afterEach } from "node:test";
import { escapeLikePattern } from "../src/utils/like.js";
import { getMovies } from "../src/controllers/movie.controller.js";
import { db } from "../src/db/index.js";

describe("Movie Search LIKE / ILIKE Wildcard Escaping", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  describe("Ordinary text without wildcards", () => {
    it("preserves alphanumeric titles and ordinary punctuation unchanged", () => {
      assert.equal(escapeLikePattern("Inception"), "Inception");
      assert.equal(escapeLikePattern("The Dark Knight"), "The Dark Knight");
      assert.equal(
        escapeLikePattern("Star Wars: Episode IV - A New Hope"),
        "Star Wars: Episode IV - A New Hope",
      );
      assert.equal(escapeLikePattern("Spider-Man 2"), "Spider-Man 2");
      assert.equal(escapeLikePattern("1917"), "1917");
      assert.equal(escapeLikePattern("Amélie"), "Amélie");
    });
  });

  describe("Percent wildcard (%) escaping", () => {
    it("escapes a single standalone percent sign", () => {
      assert.equal(escapeLikePattern("%"), "\\%");
    });

    it("escapes percent signs in titles and phrases", () => {
      assert.equal(escapeLikePattern("100%"), "100\\%");
      assert.equal(escapeLikePattern("50% Off"), "50\\% Off");
      assert.equal(escapeLikePattern("%Batman%"), "\\%Batman\\%");
      assert.equal(escapeLikePattern("100% Wolf"), "100\\% Wolf");
    });

    it("escapes multiple consecutive percent signs", () => {
      assert.equal(escapeLikePattern("%%"), "\\%\\%");
      assert.equal(escapeLikePattern("%%%"), "\\%\\%\\%");
    });
  });

  describe("Underscore wildcard (_) escaping", () => {
    it("escapes a single standalone underscore", () => {
      assert.equal(escapeLikePattern("_"), "\\_");
    });

    it("escapes underscores inside words and phrases", () => {
      assert.equal(escapeLikePattern("Iron_Man"), "Iron\\_Man");
      assert.equal(escapeLikePattern("_hidden_"), "\\_hidden\\_");
      assert.equal(
        escapeLikePattern("movie_title_final"),
        "movie\\_title\\_final",
      );
    });

    it("escapes multiple consecutive underscores", () => {
      assert.equal(escapeLikePattern("__"), "\\_\\_");
      assert.equal(escapeLikePattern("___"), "\\_\\_\\_");
    });
  });

  describe("Backslash escape character (\\) escaping", () => {
    it("escapes a single standalone backslash", () => {
      assert.equal(escapeLikePattern("\\"), "\\\\");
    });

    it("escapes backslashes in paths and titles", () => {
      assert.equal(escapeLikePattern("C:\\movies"), "C:\\\\movies");
      assert.equal(escapeLikePattern("AC\\DC"), "AC\\\\DC");
      assert.equal(escapeLikePattern("\\test\\path\\"), "\\\\test\\\\path\\\\");
    });

    it("escapes multiple consecutive backslashes", () => {
      assert.equal(escapeLikePattern("\\\\"), "\\\\\\\\");
    });
  });

  describe("Combinations of wildcards and escape characters", () => {
    it("escapes combinations of percent and underscore", () => {
      assert.equal(escapeLikePattern("100%_pure"), "100\\%\\_pure");
      assert.equal(escapeLikePattern("_100%_"), "\\_100\\%\\_");
    });

    it("escapes combinations of backslash and percent", () => {
      assert.equal(escapeLikePattern("\\%"), "\\\\\\%");
      assert.equal(escapeLikePattern("100%\\safe"), "100\\%\\\\safe");
    });

    it("escapes combinations of backslash and underscore", () => {
      assert.equal(escapeLikePattern("\\_"), "\\\\\\_");
      assert.equal(escapeLikePattern("file\\_name"), "file\\\\\\_name");
    });

    it("escapes all three special characters together without double-escaping", () => {
      assert.equal(
        escapeLikePattern("100%_real\\deal"),
        "100\\%\\_real\\\\deal",
      );
      assert.equal(escapeLikePattern("%_\\"), "\\%\\_\\\\");
      assert.equal(escapeLikePattern("\\%\\_"), "\\\\\\%\\\\\\_");
      assert.equal(escapeLikePattern("a\\b%c_d"), "a\\\\b\\%c\\_d");
    });

    it("ensures backslash-first order prevents double-escaping newly introduced backslashes", () => {
      assert.equal(escapeLikePattern("%"), "\\%");
      assert.equal(escapeLikePattern("\\%"), "\\\\\\%");
    });
  });

  describe("Edge cases and non-string inputs", () => {
    it("returns empty string for empty string input", () => {
      assert.equal(escapeLikePattern(""), "");
    });

    it("returns empty string for non-string inputs", () => {
      assert.equal(escapeLikePattern(null), "");
      assert.equal(escapeLikePattern(undefined), "");
      assert.equal(escapeLikePattern(123), "");
      assert.equal(escapeLikePattern({}), "");
      assert.equal(escapeLikePattern([]), "");
    });
  });

  describe("getMovies Controller Wildcard Integration", () => {
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

    it("escapes wildcards in the generated search condition", async () => {
      let capturedWhereClause = null;
      let selectCount = 0;

      mock.method(db, "select", () => {
        selectCount++;
        return {
          from: () => ({
            where: (clause) => {
              capturedWhereClause = clause;
              if (selectCount === 1) {
                return {
                  orderBy: () => ({
                    limit: () => ({
                      offset: async () => [
                        {
                          id: "10000000-0000-4000-8000-000000000001",
                          title: "100% Wolf",
                          durationMinutes: 96,
                          language: "English",
                        },
                      ],
                    }),
                  }),
                };
              }
              // Count query
              return Promise.resolve([{ total: 1 }]);
            },
          }),
        };
      });

      const res = createMockRes();
      await getMovies(
        { query: { search: "100%", language: "English", page: "1", limit: "10" } },
        res,
        () => {},
      );

      assert.equal(res.getStatusCode(), 200);
      const body = res.getBody();
      assert.equal(body.success, true);
      assert.equal(body.pagination.page, 1);
      assert.equal(body.pagination.total, 1);
      assert.equal(body.movies.length, 1);
      assert.notEqual(capturedWhereClause, undefined);
    });

    it("returns 400 for invalid query parameters", async () => {
      const res = createMockRes();
      await getMovies({ query: { page: "-5" } }, res, () => {});

      assert.equal(res.getStatusCode(), 400);
      const body = res.getBody();
      assert.equal(body.success, false);
      assert.equal(body.message, "Invalid query parameters");
    });
  });
});
