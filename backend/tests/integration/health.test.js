import request from "supertest";
import { describe, expect, it } from "vitest";

// Import app.js, bukan server.js: server.js menyambung ke MongoDB dan membuka
// port, sedangkan app.js bisa dites tanpa keduanya.
import app from "../../src/app.js";

describe("GET /health", () => {
    it("membalas 200 dengan status healthy", async () => {
        const res = await request(app).get("/health");

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ success: true, status: "healthy" });
    });

    it("mengirim header X-Request-Id", async () => {
        const res = await request(app).get("/health");

        expect(res.headers["x-request-id"]).toBeTruthy();
    });
});

describe("Format error (SPEC 16.2)", () => {
    it("route yang tidak ada membalas 404 dengan bentuk error standar", async () => {
        const res = await request(app).get("/api/v1/route-yang-tidak-ada");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            success: false,
            error: {
                code: "ROUTE_NOT_FOUND",
                message: expect.any(String),
                details: null,
                requestId: res.headers["x-request-id"],
            },
        });
    });

    it("JSON rusak membalas 400 INVALID_JSON, bukan 500", async () => {
        const res = await request(app)
            .post("/api/v1")
            .set("Content-Type", "application/json")
            .send('{"name":"Budi",}');

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_JSON");
    });

    it("X-Request-Id dari client yang tidak wajar diganti ID baru", async () => {
        const res = await request(app).get("/health").set("X-Request-Id", "A".repeat(500));

        expect(res.headers["x-request-id"]).not.toBe("A".repeat(500));
    });
});
