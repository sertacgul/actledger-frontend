# Teklif Yonetimi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Satis modulune teklif olusturma, durum yonetimi, PDF export ve siparise donusturme.

**Architecture:** Quote + QuoteLine Prisma modelleri. Mevcut sales router'a quote endpoint'leri eklenir. Frontend'de QuotesTab component'i. PDF icin pdfkit kullanilir.

**Tech Stack:** Prisma + Express + pdfkit (backend), React + TypeScript (frontend)

---

4 task: Backend model + service + router, Frontend QuotesTab + hooks
