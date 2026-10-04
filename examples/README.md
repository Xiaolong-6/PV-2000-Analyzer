# Built-in examples

These XML files are **sanitized demonstration datasets** used by the clickable analyzer tags on the landing page.

They preserve representative PV-2000 XML structure and measurement-family shape so users can explore the interface without supplying a file. They are not public reference cases and must not be used as validation evidence.

A built-in example is also a **scientific demonstration**, not merely a parser fixture. Its headline quantities must be finite and interpretable wherever that measurement family normally provides them. Sanitization must preserve the relationships used by the analyzer: paired channels may be shifted together, spatial patterns may be retained with anonymized identity, and synthetic channels must be generated from a coherent model. Do not independently jitter coupled quantities when that would break the measurement physics or make the analyzer report `INVALID` / unavailable results.

Privacy and provenance rules for this directory:

- identifying names, result identifiers, sample/lot metadata and original acquisition timestamps are removed or replaced;
- measurement values are transformed or synthesized for demonstration rather than published as the original private measurements;
- no vendor CSV/XPS output, screenshot, manual, binary or other private reference artifact is included;
- the QSS Injection example uses a representative private recipe/schema shape with a synthetic DataItem payload because the selected source recipe did not contain a completed sweep payload;
- validation claims continue to come only from the documented paired-reference workflow, not from these examples.

The build embeds these files into the self-contained HTML so they work both on GitHub Pages and in **Download Offline HTML** mode.
