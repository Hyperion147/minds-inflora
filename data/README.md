# INFLORA Engine Data Pack

This pack is for a hackathon prototype.

## Official CPI data
- Series: CPI 2024=100
- Sector: All-India Combined
- Latest month included: July 2026 (provisional)
- Headline CPI inflation: 4.45%
- Division weights: CPI 2024 structure, combined weights.
- July 2026 division indices/inflation: MoSPI July 2026 press release.

## Important
The CPI values in this pack are official MoSPI values. The merchant mapping and demo transactions are SYNTHETIC prototype data and must not be represented as official statistics.

## Engine
Personal inflation = Σ(user spending weight × CPI division inflation)

Driver contribution in percentage points = category weight × CPI inflation.

For "per ₹100 impact", a contribution of 1.25 percentage points means approximately ₹1.25 of price-pressure impact per ₹100 of the user's expenditure basket, under the simplified weighted model.

## Transaction eligibility
Prefer consumption debits. Exclude income/credits, own-account transfers, loan disbursals, refunds and other non-consumption flows when identifiable.

## Source
MoSPI July 2026 CPI press release:
https://www.mospi.gov.in/uploads/latestReleases/latest_release_1786529680747_3113661d-1a2b-4b9a-af06-b340193ef9a0_Press_Release_CPI_July_2026.pdf

MoSPI CPI 2024 FAQ / weights:
https://mospi.gov.in/uploads/documents/documents/1770891066052-Annexure_V.pdf
