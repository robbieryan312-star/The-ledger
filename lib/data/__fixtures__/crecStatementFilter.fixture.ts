/**
 * CREC "Said" statement filter — corpus-seeded regression fixture.
 *
 * This file is the DURABLE, single source of truth for the procedural-boilerplate filter.
 * Every string in KNOWN_BAD is a VERBATIM fragment pulled from the real Congressional Record
 * data that was once mislabeled as a member "Said" statement. Every string in KNOWN_GOOD is a
 * real spoken floor remark (or verified media quote) that MUST always survive the filter.
 *
 * RULES FOR THIS FILE:
 *   - It only GROWS. When a new procedural phrasing is found in the corpus, append the verbatim
 *     string to KNOWN_BAD — never delete or "reset" entries.
 *   - Strings are verbatim from the corpus (topicPositions.json / committed HEAD), not invented.
 *   - `npm run build` runs the fixture test (scripts/__tests__/crecProceduralFilter.test.ts),
 *     so any regression (a bad string passing, or a good string dropped) FAILS the build.
 *
 * A valid "Said" statement reads as the member SPEAKING — it opens like
 * "Mr./Ms. NAME. Mr./Madam President/Speaker, ..." — or is a verbatim attributed media quote.
 * Everything else the Record carries under a member's name (amendment/bill/resolution
 * submissions, constitutional-authority clauses, cosponsor lists, roll-call/vote rosters,
 * quoted statutory text) is procedural clerk output and is NEVER a statement, even verbatim.
 */

export interface CrecFilterFixtureCase {
  /** Short human label — member + category, for test failure messages. */
  label: string;
  /** Verbatim string from the corpus. */
  text: string;
}

/** Procedural boilerplate — MUST all be rejected by isProceduralCrecText(). */
export const KNOWN_BAD: CrecFilterFixtureCase[] = [
  {
    label: 'M000355 amendment submission (S. 4784)',
    text: 'Mr. McConnell, and Mr. Merkley) submitted an amendment intended to be proposed by him to the bill S. 4784, to authorize appropriations for fiscal year 2027 for military activities of the Department of Defense, for military construction, and for defense activities of the Department of Energy, to prescribe military personnel strengths for such fiscal year, and for other purposes; which was ordered to lie on the table; as follows: At the end of title XII, add the following: Subtitle F--Bringing Real Accountability Via Enforcement in Burma Act SEC. 1281. SHORT TITLE. This subtitle may be cited as',
  },
  {
    label: 'M000355 roll-call announcement + roster',
    text: 'Mr. McConnell). Mr. DURBIN. I announce that the Senator from Colorado (Mr. Bennet) is necessarily absent. The result was announced--yeas 47, nays 50, as follows: YEAS--47 Alsobrooks Baldwin Blumenthal Blunt Rochester Booker Cantwell Collins Coons Cortez Masto Duckworth Durbin Gallego Gillibrand Hassan Heinrich Hickenlooper Hirono Kaine Kelly Kim King Klobuchar Lujan Markey Merkley Murkowski Murphy Murray Ossoff Padilla Peters Reed Rosen Sanders Schatz Schiff Schumer Shaheen Slotkin Smith Van Hollen Warner Warnock Warren Welch Whitehouse Wyden NAYS--50 Armstrong Banks Barrasso Blackburn Boozman',
  },
  {
    label: 'B001267 resolution submission (S. Res. 796)',
    text: 'Mr. Bennet, Ms. Hirono, Mr. Schiff, Mr. Van Hollen, Ms. Warren, Mr. Wyden, Mr. Padilla, and Mr. Booker) submitted the following resolution; which was referred to the Committee on the Judiciary: S. Res. 796 Whereas, as the United States approaches the 250th anniversary of its founding, the people of the United States reflect on the Nation\'s history, progress, and enduring commitment to the principles of liberty and justice;',
  },
  {
    label: 'B001267 sponsor list + bill intro (S. 4879)',
    text: 'Mr. Bennet, Mr. Blumenthal, Mr. Heinrich, Ms. Hirono, Mr. Hickenlooper, Ms. Klobuchar, Mr. Merkley, Mr. Markey, Mr. Reed, Mrs. Shaheen, Mr. Van Hollen, Ms. Warren, Mr. Whitehouse, Mr. Wyden, Mr. Padilla, Ms. Rosen, Mr. Lujan, Ms. Cortez Masto, and Mr. Schiff): S. 4879. A bill to ensure the right to provide reproductive health care services, and for other purposes; to the Committee on the Judiciary.',
  },
  {
    label: 'B001267 amendment w/ statutory subsection',
    text: 'Mr. Bennet) submitted an amendment intended to be proposed by him to the bill S. 4784, to authorize appropriations for fiscal year 2027 for military activities of the Department of Defense, and for other purposes; which was ordered to lie on the table; as follows: In section 1224(a), strike paragraph (1) and insert the following: (1) In general.--Not later than 90 days after the date of the enactment of this Act, the Secretary of Defense, in coordin',
  },
  {
    label: 'S000033 amendment call-up (5159)',
    text: 'Mr. SANDERS. Mr. President, I call up my amendment 5159 and ask that it be reported by number. The ACTING PRESIDENT pro tempore. The clerk will report. The legislative clerk read as follows: The Senator from Vermont [',
  },
  {
    label: 'O000172 unanimous consent first-sponsor request (H.R. 5658)',
    text: 'Ms. OCASIO-CORTEZ. Mr. Speaker, I ask unanimous consent that I may hereafter be considered to be the first sponsor of H.R. 5658, the Child Care for Every Community Act, a bill originally introduced by Representative Sherrill of New Jersey, for the purpose of adding cosponsors and requesting reprintings pursuant to clause 7 of rule XII.',
  },
  {
    label: 'O000172 bill intro (H.R. 9395)',
    text: 'OCASIO-CORTEZ: H.R. 9395. A bill to amend title XVIII of the Social Security Act to require certain reporting with respect to agents and brokers of Medicare Advantage organizations; to the Committee on Ways and Means, and in addition to the Committee on Energy and Commerce, for a period to be subsequently determined by',
  },
  {
    label: 'O000172 cosponsor list + bill intro (H.R. 9442)',
    text: 'OCASIO-CORTEZ (for herself, Mr. McGovern, Ms. Tlaib, Mrs. Watson Coleman, Mrs. Grijalva, Ms. Sewell, Mr. Garcia of Illinois, Mr. Goldman of New York, Mr. Cohen, and Mr. Carson): H.R. 9442. A bill to impose a moratorium on the construction of new data centers until legislation is enacted that safeguards the public from the dangers of artificial intelligence; to the Committee on Energy and Commerce',
  },
  {
    label: 'O000172 constitutional authority (H.R. 9442)',
    text: 'OCASIO-CORTEZ: H.R. 9442. Congress has the power to enact this legislation pursuant to the following: Clause 3 of section 8 of article I of the Constitution and clause 18 of section 8 of article I of the Constitution.',
  },
  {
    label: 'O000172 vote roster (climate)',
    text: 'Ocasio-Cortez Olszewski Omar Onder Owens Pallone Palmer Panetta Pappas Patronis Pelosi Perez Peters Pettersen Pfluger Pingree Pocan Pou Pressley Quigley Ramirez Randall Raskin Reschenthaler Riley (NY) Rivas Rogers (AL) Rogers (KY) Ross Rouzer Ruiz Rulli Rutherford Salinas Sanchez Scalise Scanlon Schmidt Schneider Scholten Schrier Schweikert Scott (VA) Scott, Austin Sessions Sewell Sherman Shreve Simon Simpson Smith (MO) Smith (NE) Smith (NJ) Smith (WA) Sorensen Soto Stanton Stauber Stefanik Steil Steube Stevens Strickland Strong Subramanyam Suozzi Sykes Takano Taylor Tenney Thanedar Thompson (',
  },
  {
    label: 'O000172 vote roster (economy)',
    text: 'Ocasio-Cortez Olszewski Omar Owens Pallone Palmer Panetta Pappas Patronis Pelosi Perez Peters Pettersen Pfluger Pingree Pocan Pou Pressley Quigley Ramirez Randall Raskin Reschenthaler Riley (NY) Rivas Rogers (AL) Rogers (KY) Ross Rouzer Ruiz Rulli Rutherford Salinas Sanchez Scalise Scanlon Schmidt Schneider Scholten Schrier Scott (VA) Scott, Austin Sessions Sewell Sherman Shreve Simon Simpson Smith (MO) Smith (NE) Smith (NJ) Smith (WA) Sorensen Soto Spartz Stansbury Stanton Stauber Stefanik Steil Stevens Strickland Strong Subramanyam Suozzi Sykes Takano Taylor Tenney Thanedar Thompson (CA) Tho',
  },
  {
    label: 'P000197 cosponsor list + resolution intro (H. Res. 1380)',
    text: 'Pelosi, Mrs. Beatty, Mr. Carbajal, Mr. Carter of Louisiana, Ms. Barragan, Mr. Cisneros, Ms. Escobar, Mr. Davis of Illinois, Ms. Dean of Pennsylvania, Mr. Thompson of Mississippi, Mr. Moulton, Ms. Kaptur, Mr. Johnson of Georgia, Mr. Courtney, Ms. Clarke of New York, Mr. Stanton, Mrs. Grijalva, Ms. Leger Fernandez, and Ms. Garcia of Texas): H. Res. 1380. A resolution commemorating 50 years of women at the service academies; to the Committee on Armed Services',
  },
  {
    label: 'P000197 cosponsor list + bill intro (H.R. 9270)',
    text: 'Pelosi, Mr. Casar, Mr. Castro of Texas, Mr. McGovern, Mr. Goldman of New York, Mr. Lieu, Mrs. Ramirez, Mr. Frost, Ms. Hoyle of Oregon, Ms. Salinas, Ms. Tlaib, Ms. Escobar, Ms. Ansari, Ms. Crockett, Ms. Garcia of Texas, Ms. Jacobs, Ms. Simon, Mr. Thanedar, Ms. McClellan, Ms. Randall, Mr. Garcia of Illinois, Ms. Mejia, Mrs. Foushee, Mrs. Fletcher, and Ms. Norton): H.R. 9270. A bill to address the enforcement of the immigration laws with respect to unaccompanied minors; to the Committee on the Judiciary',
  },
  {
    label: 'P000197 vote roster',
    text: 'Pelosi Perez Peters Pettersen Pfluger Pingree Pocan Pou Pressley Quigley Ramirez Randall Raskin Reschenthaler Riley (NY) Rivas Rogers (AL) Rogers (KY) Ross Rouzer Ruiz Rulli Rutherford Salinas Sanchez Scalise Scanlon Schmidt Schneider Scholten Schrier Schweikert Scott (VA) Scott, Austin Sessions Sewell Sherman Shreve Simon Simpson Smith (MO) Smith (NE) Smith (NJ) Smith (WA) Sorensen Soto Stanton Stauber Stefanik Steil Steube Stevens Strickland Strong Subramanyam Suozzi Sykes Takano Taylor Tenney Thanedar Thompson (CA) Thompson (MS) Timmons Titus Tlaib Tokuda Tonko Torres (CA) Trahan Tran Turne',
  },
  {
    label: 'C001101 vote roster (climate)',
    text: 'Clark (MA) Cleaver Cline Clyburn Cohen Cole Collins Comer Conaway Correa Costa Courtney Craig Crane Crank Crawford Crockett Crow Cuellar Davids (KS) Davis (IL) Davis (NC) De La Cruz Dean (PA) DeGette DeLauro DelBene Deluzio DeSaulnier DesJarlais Dexter Diaz-Balart Dingell Doggett Donalds Downing Edwards Elfreth Ellzey Emmer Escobar Estes Evans (CO) Evans (PA) Ezell Fallon Fedorchak Feenstra Fields Figures Finstad Fischbach Fitzgerald Fitzpatrick Fleischmann Fletcher Flood Fong Foster Foushee Foxx Frankel, Lois Franklin, Scott Friedman Frost Fry Fulcher Fuller Gallagher Garamendi Garbarino Garc',
  },
  {
    label: 'C001101 vote roster (civil-liberties)',
    text: 'Clark (MA) Clarke (NY) Cleaver Cline Cloud Clyburn Clyde Cohen Cole Collins Comer Conaway Correa Costa Courtney Craig Crane Crank Crawford Crenshaw Crockett Crow Cuellar Davids (KS) Davidson Davis (IL) Davis (NC) De La Cruz Dean (PA) DeGette DeLauro DelBene Deluzio DeSaulnier DesJarlais Dexter Diaz-Balart Dingell Doggett Donalds Downing Edwards Elfreth Ellzey Emmer Escobar Espaillat Estes Evans (CO) Evans (PA) Ezell Fallon Fedorchak Feenstra Fields Figures Fine Finstad Fischbach Fitzgerald Fitzpatrick Fleischmann Fletcher Flood Fong Foster Foushee Foxx Frankel, Lois Franklin, Scott Friedman Fr',
  },
  {
    label: 'C001101 quoted statutory bill text (wilderness)',
    text: 'Clark and Lincoln Counties, Nevada, to be known as the ``Southern Paiute Wilderness\'\'. (2) Boundary.--The boundary of any portion of the wilderness area that is bordered by a road shall be not less than 50 feet from the centerline of the road. (3) Map and legal description.-- (A) In general.--As soon as practicable after the date of enactment of this Act, the Secretary shall prepare a map and legal description of the wilderness area. (B) Effect.--The map and legal description prepared under subparagraph (A) shall have the same force and effect as if included in this section, except that the Se',
  },
  // --- Phase 17b 50-member speaking-diversity batch: procedural floor actions that open with an
  //     address to the chair but carry no substantive position. ---
  {
    label: 'D000563 quorum-call rescission',
    text: 'Mr. DURBIN. Mr. President, I ask unanimous consent that the order for the quorum call be rescinded. The PRESIDING OFFICER. Without objection, it is so ordered. The Democratic whip. ____________________',
  },
  {
    label: 'H001042 quorum-call rescission',
    text: 'Mr. HIRONO. Mr. President, I ask unanimous consent that the order for the quorum call be rescinded. The PRESIDING OFFICER. Without objection, it is so ordered. The online Record has been corrected to read: Ms. HIRONO. Mr. President, I ask unanimous consent that the order for the quorum call be rescinded.',
  },
  {
    label: 'S000148 quorum-call rescission + recognition',
    text: 'Mr. SCHUMER. Mr. President, I ask unanimous consent that the order for the quorum call be rescinded. The ACTING PRESIDENT pro tempore. Without objection, it is so ordered. Recognition of the Minority Leader The Democratic leader is recognized. Iran',
  },
  {
    label: 'T000250 motion to proceed to executive session',
    text: 'Mr. THUNE. Mr. President, I move to proceed to executive session to consider Calendar No. 776. The PRESIDING OFFICER. The question is on agreeing to the motion. The motion was agreed to. The PRESIDING OFFICER. The clerk will report the nomination.',
  },
  {
    label: 'T000250 resume legislative session / morning business',
    text: 'Mr. THUNE. Mr. President, I ask unanimous consent that the Senate resume legislative session and be in a period of morning business, with Senators permitted to speak therein for up to 10 minutes each.',
  },
  {
    label: 'C001098 committee nomination report',
    text: 'Mr. CRUZ. Mr. President, for the Committee on Commerce, Science, and Transportation I report favorably the following nomination lists which were printed in the Record on the dates indicated, and ask unanimous consent, to save the expense of reprinting on the Executive Calendar that these nominations lie at the Secretary\'s desk for the information of Senators.',
  },
  {
    label: 'C001075 intern floor-privileges request',
    text: 'Mr. CASSIDY. Mr. President, I ask unanimous consent for the following interns in my office to be granted floor privileges until June 24, 2026: Stella Israelite and William Homes.',
  },
  {
    label: 'R000584 request to speak before scheduled recess',
    text: 'Mr. RISCH. Mr. President, I ask unanimous consent to speak for up to 5 minutes before the previously scheduled recess. The PRESIDING OFFICER. Without objection, it is so ordered. ____________________',
  },
  {
    label: 'T000250 ceremonial intern recognition',
    text: 'Mr. THUNE. Mr. President, today I recognize Elena Rossi, an intern in my Washington, DC, office, for all of the hard work she has done for me, my staff, and the State of South Dakota over the past several weeks. Elena is a graduate of Georgetown Visitation Preparatory School in Washington, DC.',
  },
];

/** Genuine spoken floor prose / verified media quotes — MUST all pass the filter. */
export const KNOWN_GOOD: CrecFilterFixtureCase[] = [
  {
    label: 'S000033 floor speech — artificial intelligence',
    text: 'Mr. SANDERS. Mr. President, I want to say a few words about what I consider to be one of the most important issues not only facing our country but facing the world, and that is the advent of artificial intelligence, which most experts agree will almost certainly be the most transformational technology in the history of humanity. It will profoundly impact the lives of every man, woman, and child in our country.',
  },
  {
    label: 'S000033 floor speech — student debt / education',
    text: 'Mr. SANDERS. Mr. President, in the United States today, 42 million Americans are drowning in $1.7 trillion in student debt--42 million Americans, $1.7 trillion in student debt. Further, a recordbreaking 9 million Americans are now in default on their student loans. Instead of providing financial relief to these Americans, the Trump administration is about to make a bad situation even worse.',
  },
  {
    label: 'S000033 verified media quote — health care',
    text: 'Together we are going to end the international embarrassment of the United States of America, our great country, being the only major nation on earth not to guarantee health care to all as a right.',
  },
  {
    label: 'M001184 floor speech — question of privilege',
    text: 'Mr. MASSIE. Mr. Speaker, I rise to raise a question of the privileges of the House and offer a resolution previously noticed.',
  },
  // --- Phase 17b batch: substantive floor speeches that MUST survive the expanded procedural
  //     rules (guard against over-rejection of genuine remarks that mention procedural nouns). ---
  {
    label: 'S000148 floor speech — Republican agenda',
    text: 'Mr. SCHUMER. Mr. President, everywhere you look, Republicans are one big, hot mess. The reason is simple: Donald Trump is pursuing policies that are terrible for America and despised by the American people. The Republicans know just how unpopular Trump\'s agenda is, but they fall into line out of fear or blind loyalty or some of each.',
  },
  {
    label: 'C001056 floor speech — China / Deng Xiaoping',
    text: 'Mr. CORNYN. Mr. President, there is an old Chinese saying attributed to Deng Xiaoping that goes: Hide your strength, bide your time. Hide your strength, bide your time. China has, of course, been hiding its strength and biding its time for many years now.',
  },
  {
    label: 'C001075 floor speech — health insurance tax treatment',
    text: 'Mr. CASSIDY. Mr. President, people know that the Federal Government helps Americans purchase health insurance. We do that by making health insurance tax deductible. When you pay for your premiums, it is on what is called a pretax basis, but something is wrong.',
  },
  {
    label: 'R000584 floor speech — H. Con. Res. 86',
    text: 'Mr. RISCH. Mr. President, I am going to talk for a minute about H. Con. Res. 86, the item of business that is before the U.S. Senate this morning. This is a House concurrent resolution, which states, in operative part: Congress directs',
  },
  {
    label: 'B001277 floor speech — DACA',
    text: 'Mr. BLUMENTHAL. Mr. President, I am honored to join my colleagues this afternoon in celebrating the Deferred Action for Children Arrivals, or DACA, Program and its absolutely historic impact on our country, but also to mourn and to express outrage at the all-out assault launched against this program by the Trump administration.',
  },
  // --- Phase 17b gendered-honorific fix: real female floor remarks that opened with a NON-"Mr."
  //     honorific ("Mrs./Ms. NAME. Mr./Madam President/Speaker, ...") and were silently excluded
  //     while the opener regex only accepted "Mr." These MUST pass the procedural filter (they are
  //     spoken floor prose, not clerk boilerplate). Verbatim from GovInfo CREC. ---
  {
    label: 'R000600 floor tribute (female honorific)',
    text: 'Mrs. RADEWAGEN. Mr. Speaker, I rise today to honor the life of David Thomas Pangelinan Perez, who passed away on February 16, 2026.',
  },
  {
    label: 'B001230 floor speech — Iran war (female honorific)',
    text: "Ms. BALDWIN. Mr. President, today, I rise in opposition to Donald Trump's illegal war in Iran. I come to ask a simple question: What has this war gotten us?",
  },
];
