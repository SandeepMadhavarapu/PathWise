# 01 — The Thesis (the ONE idea)

If you read nothing else, read this.

## The idea

Every competitor building in this space will build a **silo**: a FAFSA helper, a visa chatbot, a
residency calculator. Each answers one question in one domain.

**Immigration status is the hidden variable that determines outcomes in all three domains — and no
existing tool models the interaction.** One fact — the student's visa type — simultaneously gates
the residency engine, the aid engine, and the immigration engine. A tool that treats these as
separate is not just less convenient; it can be *wrong*, because it never sees that a single fact
closed three doors at once.

**Standing** is the only entry that models the student as one record and reasons across all three
domains at once.

## Three primary-source citations that prove the interaction is real

These are not our interpretations. They are the source documents saying the same fact controls
three different offices.

### 1. F-1 status blocks Virginia domicile outright
> Any individual holding a student visa or another temporary visa does not have the capacity to
> establish domicile in Virginia.

Source: **SCHEV Domicile Guidelines, Part II Section 03(A) and Section 02(4)**, issued under Code of
Virginia §23.1-510(D).

### 2. The same status blocks Virginia state financial aid
> Students currently on an F-1 student visa are not eligible to be considered for Virginia state
> financial aid.

Source: **SCHEV / Virginia community college (VASA) guidance.**

### 3. The analysis is *gated* on status before anything else runs
> The institution shall first determine whether the student is a national or an alien. If the
> student is neither a national nor an eligible alien, [domicile analysis does not proceed].

Source: **SCHEV Domicile Guidelines, Part II Section 03(A).**

## What this means for the product

One fact — visa type — gates residency, aid, and immigration **simultaneously**. So the correct
architecture is not three modules; it is **one status-aware reasoning engine** with three rule
domains reading the same student record.

## The design consequence (this is a rule, not a suggestion)

**We always lead with the cross-domain interaction, never with the module count.** The pitch is
never "we do three things." The pitch is: *one fact about you just closed two doors, and here is
exactly why, with the citation.* The hero of every screen is the interaction, not the inventory.

## Why this beats a polished single-domain tool

A beautifully executed "International Student Visa Assistant" is our most dangerous competitor —
polished narrowness beats broad-and-shallow. We do not beat it by being broader. We beat it by
doing something it structurally *cannot*: showing that the student's status is the same variable
across immigration, tuition, and aid, and that acting in one domain moves the others. That is the
one thing a single-domain tool can never show, no matter how polished.
