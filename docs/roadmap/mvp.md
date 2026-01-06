# TabFlow – MVP Scope

> Derived from: `tab_flow_full_architecture_roadmap_authoritative.md`

---

## Definition of MVP

The MVP is the **minimum shippable product** that validates TabFlow's core value proposition:

> A local-first, reliability-focused tab manager with optional AI-powered grouping.

MVP ships at the end of **Phase 2 (Week 3)**.

---

## Exact MVP Scope

### ✅ Included in MVP

| Feature                 | Details                                        |
| ----------------------- | ---------------------------------------------- |
| **Extension scaffold**  | Manifest V3, TypeScript, React, Tailwind       |
| **IndexedDB storage**   | Sessions, groups, tab snapshots                |
| **Save current tabs**   | Capture all open tabs as a session             |
| **Restore session**     | Reopen all tabs from a saved session           |
| **Popup UI**            | Display sessions, groups, search tabs          |
| **Manual grouping**     | User can organize tabs into groups manually    |
| **Undo stack**          | Last 10 actions are reversible                 |
| **Local backup**        | Hourly auto-backup to IndexedDB                |
| **Manual export**       | Export all data as JSON                        |
| **Manual import**       | Import JSON with validation                    |
| **Azure Function**      | Deployed and operational                       |
| **AI grouping**         | Pro-tier users can trigger AI auto-grouping    |
| **AI preview**          | User sees proposed grouping before applying    |
| **Free/Pro tier logic** | Enforce limits (100 tabs free, AI is Pro-only) |
| **Options page**        | Settings, backup config, tier display          |

---

## What is Explicitly Excluded from MVP

| Exclusion                    | Rationale                                                   |
| ---------------------------- | ----------------------------------------------------------- |
| **Cloud sync**               | Requires auth, encryption, sync conflict resolution—Phase 3 |
| **Payments integration**     | Requires payment provider setup—Phase 3                     |
| **Chrome Web Store listing** | Happens at launch, after MVP validation                     |
| **Cross-browser support**    | Chrome-only for MVP; Firefox/Edge later                     |
| **Content script injection** | Not needed; extension reads tab metadata only               |
| **Keyboard shortcuts**       | Nice-to-have, not core value                                |
| **Tab deduplication**        | Useful but not essential for launch                         |
| **Pinned tab handling**      | Treat same as regular tabs for MVP                          |
| **Window management**        | MVP focuses on tabs, not windows                            |
| **Session scheduling**       | No auto-restore at specific times                           |
| **Sharing sessions**         | No URL-based session sharing                                |
| **Analytics/telemetry**      | Privacy-first; no tracking in MVP                           |
| **Onboarding flow**          | Keep it simple; tooltip hints at most                       |
| **Dark mode toggle**         | Ship with one theme; add toggle later                       |
| **Localization**             | English only for MVP                                        |

---

## Non-Goals

These are **explicitly not goals** for TabFlow MVP:

### 1. Auto-closing tabs

TabFlow **never** closes tabs automatically. The user is in full control. AI groups tabs; it does not manage the browser's tab lifecycle.

### 2. Automatic AI grouping

AI runs **only when the user clicks "Auto-Group"**. There is no background AI processing, no scheduled AI calls, no "smart" automatic behavior.

### 3. Reading page content

TabFlow uses **title + domain only**. It does not inject content scripts, does not scrape page content, and does not analyze page text.

### 4. Behavior tracking

No analytics, no usage tracking, no browsing history collection. Privacy is a feature.

### 5. Complex session sync

Cloud sync is Phase 3. MVP is local-first only.

### 6. Multi-device support

Single-device for MVP. Cross-device sync is a Pro feature in Phase 3.

### 7. Monetization

MVP does not process payments. Tier logic exists, but actual payment flow is Phase 3.

---

## MVP Success Criteria

| Metric                           | Target                               |
| -------------------------------- | ------------------------------------ |
| Save/restore works               | 100% reliability                     |
| AI grouping returns valid result | >95% of requests                     |
| Popup mount time                 | <50ms                                |
| No data loss                     | Zero tolerance                       |
| Undo works                       | All reversible actions can be undone |
| Export/import round-trip         | Data integrity preserved             |

---

## MVP Technical Milestones

| Week   | Milestone                                              |
| ------ | ------------------------------------------------------ |
| Week 1 | Extension scaffold, IndexedDB, save/restore tabs       |
| Week 2 | Popup UI complete, undo stack, local backup            |
| Week 3 | Azure Function deployed, AI grouping, tier enforcement |

---

## What Happens After MVP

Phase 3 (Week 4) adds:

- Cloud sync (encrypted)
- Payment integration
- Chrome Web Store launch

See [Development Phases](./phases.md) for the full roadmap.

---

## Related Documents

- [Development Phases](./phases.md)
- [System Overview](../architecture/overview.md)
- [AI Grouping Architecture](../architecture/ai-grouping.md)
