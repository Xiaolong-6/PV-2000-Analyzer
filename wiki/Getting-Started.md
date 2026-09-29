# Getting Started

## 1. Open PV-2000 Analyzer

Use the hosted analyzer:

https://xiaolong-6.github.io/PV-2000-Analyzer/

The application runs in the browser. Imported XML files are processed locally and are not uploaded by the analyzer.

For offline use, choose **Download Offline HTML** on the landing page and open that self-contained file locally.

## 2. Open an XML result

Drop a PV-2000 XML file onto the landing page or choose **Open XML**.

The analyzer reads `Measurement/@xsi:type` and selects the matching dedicated analyzer. The detected XML type is shown in the top toolbar.

If there is no dedicated analyzer, the file opens in the **Generic XML Inspector** instead of failing solely because its measurement family is unsupported.

Generic inspection is not a validation claim: it means the XML can be read and inspected, not that its scientific results are reproduced.

## 3. Navigate a folder

After one XML is open, choose **Folder** to authorize its directory.

Once the current file is matched inside that authorized folder:

- `←` opens the previous XML;
- `→` opens the next XML;
- filenames are sorted naturally/numerically;
- the arrow buttons do not open a new picker.

Browser security does not allow the analyzer to enumerate arbitrary neighboring files after an ordinary single-file selection, which is why folder authorization is a separate explicit action.

## 4. Identify what is measured and what is derived

Before interpreting a quantity, check its provenance:

- **stored/raw** — represented directly in XML;
- **controller/device result** — evaluated before the viewer receives the file;
- **corrected** — analyzer applies an offset, sign convention or calibration;
- **derived physical result** — analyzer evaluates a stated scientific relation;
- **compatibility result** — profile-specific calculation intended to reproduce an established PV-2000 output path;
- **Analyzer-only result** — optional extra interpretation without a claim that PV-2000 reports the same result.

The family pages document these distinctions.

## 5. Understand availability versus filtering

A value can be unavailable because its scientific inputs are missing, invalid or outside a defined result domain. This is different from a finite supported value that has merely been excluded by the user’s **Valid-data filter**.

The analyzer keeps these states separate so a filter cannot turn an intrinsically unsupported point into a valid scientific result.

See [Using the Analyzer](Using-the-Analyzer) for the common UI model.

## 6. Understand validation labels

- **Validated** — numerically compared with matching PV-2000 output for the stated profile.
- **Reproduced at shown precision** — comparison is limited by rounded/display-only vendor output.
- **Inferred** — implemented/documented behavior lacks matching numeric evidence for that exact path.
- **Unsupported** — the corresponding scientific result is not provided.

A successfully opened XML can still contain inferred or unsupported result paths.

## 7. If a measurement is not supported

Do not assume a visually similar analyzer is interchangeable.

To add a new scientific result path, the project requires at least one real XML plus its matching numeric PV-2000 export. You can contribute data through the repository’s **Share PV-2000 data** issue template:

https://github.com/Xiaolong-6/PV-2000-Analyzer/issues/new?template=share-pv2000-data.yml
