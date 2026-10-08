# Minimum booking notice for tables, VIP and Group dining

Research date: 2026-10-08. Requested by Marvin after a vacant VIP table was unavailable because of capacity and advance-notice rules. Research uses public system documentation and published restaurant policies, not test bookings at external restaurants.

## Finding and decision

There is no evidence that 12 hours is the universally best restaurant booking cutoff. Existing systems support restaurant-defined notice, and published policies vary with service and preparation. A 12-hour rule is a defensible starting policy for Lumina's small VIP tables and Group/Long Tables, provided the venue uses its usual menu and needs no bespoke event preparation. This is a project recommendation, not a measured operational optimum.

Marvin explicitly selected **12 hours for both VIP and Group/Long Tables** on 2026-10-08. Keep Main Dining and Terrace at their existing effective 60-minute notice. This choice changes minimum online booking notice, not table capacity, turn time, cancellation deadlines, deposits or the 60-day advance window.

## Existing systems and published restaurant examples

| Reference | Verified public evidence | Relevance and limits |
| --- | --- | --- |
| [ResDiary: advance booking restrictions](https://resdiary.freshdesk.com/en/support/solutions/articles/4000088700-online-availability-advance-bookings-restrictions) | Restaurants configure a cutoff in minutes before a visit or before the service starts; its example stops dinner bookings 60 minutes before service. Internal bookings can still be taken. | Supports configurable policy. A service-start cutoff differs from an arrival-relative cutoff. Neither establishes a universal 12-hour default. |
| [SpotOn Reserve: program settings](https://spotonteam.atlassian.net/wiki/spaces/SK/pages/1461616866/Program%2BSettings%2BSpotOn%2BReserve%2BWeb%2BPortal) | Minimum reservation lead time is configured in minutes; maximum advance days and confirmation reminders are separate settings. | Confirms that minimum notice, booking window and reminder timing are distinct controls. |
| [ZAP: online reservations](https://zaphelp.zendesk.com/hc/en-us/articles/49242748075161-I-want-to-accept-reservations-online) | Service types include Private Dining. Minimum lead time supports a fixed daily cutoff or moving cutoff, with a one-hour-before-slot example; cancellation policy is separate. | Philippine-market system with a close match to separate dining services. Its example is not a measured recommended default for Lumina. |
| [OpenTable: availability planning glossary](https://support.opentable.com/s/article/apglossary?language=en_US) | Defines capacity, dining areas, table combinations, pacing, shifts and advance booking settings. | Useful existing-system comparison. The 1–365-day advance setting described here is a future booking window, not proof of a minimum booking notice. |
| [OMI Canberra on TableAgent](https://tableagent.com/canberra/omi-australia/table-search/) | The opened booking page says bookings require at least 24 hours to prepare for the visit. | Direct public booking interface. A search snippet said 12 hours but the opened page said 24; use the opened page and do not present OMI as verified 12-hour evidence. No booking was submitted to test enforcement. |
| [MalyThai: reservations](https://www.malythai.com/reserve) | Its group guidance, alongside a maximum of 12 guests, asks for at least 12 hours to prepare trays and table settings; parties up to four can walk in. | Explicit published 12-hour preparation example, relevant to small groups. Not evidence that every private room should use 12 hours. |
| [Joseph's Baguio: reservations](https://josephsbaguio.com/reservations) | Website booking cutoff is 24 hours; same-day guests are directed to call. Dietary notice and cancellation/refund schedules are separate. | Philippine example of a stricter online cutoff with staff handling nearer-term requests. Do not equate the 48-hour dietary notice with the table-booking cutoff. |
| [Daimasu Makati: private dining](https://daimasu.com.ph/en/private-dining) | Private rooms accommodate small groups; the kaiseki courses require reservations two days in advance. | Supports longer notice for special menus/ingredient preparation. It does not establish 48 hours for every ordinary VIP table booking. |
| [Nonie's Boracay: private dining/events](https://www.nonies.com.ph/events) | Recommends two weeks for private dining and four weeks for venue buyouts/weddings, using an inquiry and menu-planning process. | Shows why a formal event needs a separate workflow. Recommendations are not verified hard booking cutoffs, and these events differ from Lumina's ordinary table reservations. |
| [Inato on TableCheck](https://www.tablecheck.com/en/inato/reserve/landing) | Separate counter/private-room seatings and party limits; 48 hours appears in its cancellation/refund policy and 24 hours in modification terms. | A real Philippine reservation interface, but those durations are not evidence of minimum notice for creating a booking. |

## Comparison for Lumina

| Minimum notice | Suitable scenario | Practical effect |
| --- | --- | --- |
| 1 hour | Ordinary table using normal service and existing staff | Captures same-day demand. Needs accurate table inventory and readiness. Keep the existing Common/Terrace rule. |
| 12 hours | Small VIP reservation or long table using the regular menu | A guest can book a 7 PM dinner by 7 AM that day. Gives elapsed notice without a two-day restriction. Selected for VIP/Group. |
| 24 hours | Private-room coordination or larger group with next-day preparation | A 7 PM dinner must be booked by 7 PM the preceding day. More scheduling time, but less guest flexibility. A reasonable alternative if staff preparation warrants it. |
| 48 hours or more | Bespoke menus, special ingredients, decoration or private events | Longer planning is defensible only when the service needs it. Published private-event examples can require weeks. |

These are design judgments inferred from the examples, not industry prevalence statistics. Twelve elapsed hours may include overnight closure and does not guarantee twelve staffed working hours. Venue preparation requirements, supplier timing and staffing would be needed to prove the operational optimum.

## Current source mapping and implementation requirements

Before this change, the actual local room catalog reported VIP 48 hours, Group 24 hours, Common/Terrace zero additional room hours, with global min_lead_time_min=60. `BookingPolicy::interval` enforces the greater of global minutes and room-specific hours against the server clock. It rejects differences strictly below the minimum; the exact threshold can be allowed if all other conditions fit.

The Group policy applies to the Long Room, individual group tables and joined group options. Capacity still matters: lowering notice does not make V1 fit eight guests. Room cards and table-preview notice facts already read catalog values; the search-help sentence had hardcoded 48/24 wording and must match the selected rule.

Implementation must cover fresh-install reference defaults, current localhost values, safe existing-default upgrades and accurate guest copy. Verify rejection one second short of 12 hours and acceptance at exactly 12 hours for VIP, individual Group and joined Group; preserve the global one-hour rule and existing inventory/conflict checks. Do not run canonical-main reservation seeding: Marvin removed automatic demo bookings and did not request repopulation. Do not change hosted data or publish.

## Evidence limits and excluded leads

Ten primary-source pages above were opened and reviewed. No restaurant was contacted and no external reservation, payment or account action was performed. Public text does not prove live server enforcement, and policies can change. Findings are a selected comparison, not a representative survey or booking-conversion experiment.

Search surfaced hotel dining PDFs and a Molina page mentioning twelve hours. The hotel PDF failed to open; Molina's wording did not unambiguously establish a minimum cutoff. Neither is used as proof of the selected policy. OMI's conflicting snippet was resolved in favor of the opened page. Social opinions were unnecessary for establishing actual published policy.

The strongest conclusion is to configure notice by service and explain eligibility clearly. Before a future real deployment, confirm preparation time with the venue and evaluate actual booking/decline data.


## Local delivery — 2026-10-08

Selected policy is now implemented: VIP/Group 12 hours, Common/Terrace unchanged. New-install reference defaults and an idempotent previous-default upgrade match local catalog values; the public help sentence reads the catalog. Tests passed: 41 booking, 11 HTTP, four upgrade/default and 41 table-preview checks (97), plus 65-file PHP lint, syntax, main smoke and source matching. Actual read-only main previews showed V4/G1 available for eight guests tomorrow at 19:00 with 12-hour notice; desktop/mobile screenshots were inspected. Private policy recovery backup saved; protected-record hashes unchanged, zero bookings remain, no main seed/reset, hosted write or publication.
