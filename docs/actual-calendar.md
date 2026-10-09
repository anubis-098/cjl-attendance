# Actual calendar display

Attendance and Employee calendar display recorded scan intervals independently of
the planned Master shift. The planned shift remains available in the hover preview
and Attendance Details. This is a display layer, not a replacement payroll engine.

## Initial inference rules

- Sort each employee's full available scan history before pairing, including days
  outside the current calendar view. Collapse compatible duplicate scans within
  two minutes for display only; retain the source records.
- Respect explicit IN/OUT directions when available. Most imported TXT records
  have unknown direction, so their inferred direction is not definitive.
- Compare adjacent pairs across the sequence rather than alternating IN/OUT
  blindly. Unknown-direction candidates span 6–16 hours, preferring durations
  near nine hours. Explicit IN/OUT pairs may span 0.1–20 hours.
- A lone IN or unknown-direction scan starts a red eight-hour estimated period.
  A lone explicit OUT ends a red eight-hour estimated period.
- Flag close competing pairings, multiple periods assigned to one work date,
  and intervals separated by less than four hours (including overlaps) for review.
  A close gap alone does not establish that a scan is an exit.
- Associate intervals with their actual starting date. Master records provide the
  employee/day calendar entries; scans without a corresponding day entry remain
  in the source logs but are not synthesized into a new Master record.

## Review and financial safeguards

Red estimates are not written into reviews, Master data, or payroll. Copying an
Actual interval into Attendance Details copies only recorded endpoints; missing
endpoints stay blank. Supervisors must review the time and shift before saving.
Existing manual corrections take precedence and are labeled accordingly.

Calendar bulk approval accepts only a single unambiguous interval that matches
the existing attendance reconciliation. Payroll continues to use the existing
reconciliation and saved reviews. A visually inferred pair does not by itself
change wages or OT approval. Gray dashed bars represent Master plans without an
attached Actual interval.

The duration and gap thresholds are initial heuristics, not proof of attendance.
Short shifts, exceptionally long shifts, and multiple visits can require manual
review. Raw fingerprint data is preserved.

## Credited entry and colours (OT rules version 5)

The calendar still uses exact recorded timestamps for bar positions and labels.
For credited work only, minutes 00–20 (including seconds within minute 20) round
down to the hour; minutes 21–59 round up. For example 07:45, 08:01 and 08:20
credit 08:00, while 08:21 credits 09:00. Late detection still uses the unrounded
scan and the existing five-minute grace period relative to Master.

Count eight work hours plus the existing one-hour regular break from the credited
entry. Additional work is OT; it is no longer split around the Master start/end.
Regular days use x1.5. H/H8 uses x2 for the first eight credited hours and x3 for
extra hours; PH/PH8 uses x1 then x3. The existing minimum-one-hour and completed
half-hour OT rules and optional 30-minute OT break remain in effect.

The shared work-time calculation is used by reconciliation/payroll and by the
Actual colour indicator. Blue means no credited OT, yellow means credited OT,
and red takes precedence for missing/ambiguous scans. Valid confirmation changes
the background to green and adds a check. Missing endpoints display `--:--` in
the card and actual-time notice; the eight-hour estimate only positions the bar.
The hover/details show the credited start separately from the actual entry.
Hover previews stay above or below their anchor and scroll inside the available
space instead of overlapping the period.
The original pairing/review safeguards above still apply. Existing approvals
whose OT rate totals change require reconfirmation under version 5; stored
source scans and approval records are retained.

## Repeat exits and previously corrected exits

The sequence matcher can group repeat exit candidates within three hours of the
first exit and retain the final scan, while comparing the cost of leaving the
following work period intact. It never absorbs an explicit IN into that tail.
The existing maximum period duration still applies; all raw scans are retained.

If a saved correction ends a period early but the raw pair with the same entry
has a later exit within three hours, the calendar shows the full raw interval as
a red review conflict. It does not create a phantom eight-hour shift from that
later scan and does not rewrite the correction or payroll approval.

## Attendance dashboard and custom range

The presence card defaults to the current Bangkok calendar date, independent of
the displayed week. Date-header checkboxes override the dates used for the card.
It counts each known employee once across all selected dates if any raw scan is
present (including an exit or a single scan); this is not a paid-workday count.
Employee filters apply, but pagination and approval status do not change the count.

Custom From/To dates are inclusive and control both the calendar and CSV rows.
Attendance CSV In/Out values contain HH:mm, retaining the separate work-date
column. An overnight Out time can therefore be earlier than its In time.
