import { z } from "zod";
import { db } from "./db";
import { getOwner, type Owner } from "./owner";

export const privacySchema = z.object({
  en: z.string().trim().min(1).max(20000),
  el: z.string().trim().min(1).max(20000),
});

export type PrivacyContent = z.infer<typeof privacySchema>;

export function defaultPrivacy(owner: Owner): PrivacyContent {
  const contact = owner.email || "the email address you received your access code from";
  const contactEl = owner.email || "τη διεύθυνση email από την οποία λάβατε τον κωδικό πρόσβασης";
  const first = owner.first;
  return {
    en: `# Privacy

## Who runs this site

This is the private professional profile of ${owner.name}, who is responsible for the data described here.

Contact: ${contact}

## What the site does

You enter with an access code that ${first} gave to you or your company. Inside, you can read the professional profile and ask questions to Donna, an AI assistant that answers only about ${first}'s professional background.

Donna is an AI. Her answers are generated automatically from material ${first} wrote, and they can contain mistakes. For anything important, confirm with ${first} directly.

## What is stored

- The access code you used and the times you visited.
- Your IP address and browser type, recorded when you enter the code.
- The questions you type and Donna's answers.
- The answers you choose to give in the feedback form, with your name and email only if you enter them.
- One cookie that keeps you signed in. It is required for the site to work and expires together with your access code. There are no analytics, advertising or tracking cookies.

## Why

This site exists so that ${first} can present a professional profile to invited people. Your access code opens the profile for you, and your questions are processed so that Donna can answer them. Conversations may be reviewed so that the profile and Donna's answers stay accurate and useful, and basic technical data is used to keep the service secure. This rests on the legitimate interest in presenting a professional background and running the service safely.

## Who else processes it

To produce an answer, the text of your question is sent to Anthropic (the AI model that writes the answer) and to OpenAI (to find the relevant part of the profile). Both are based in the United States. Nothing is sold or shared for advertising.

Please do not type personal or confidential information into the chat.

## How long

Visits and conversations are kept while they are useful for the purposes above. They are deleted when the access link they belong to is removed, or earlier if you ask.

## Your rights

You can ask for a copy of your data, ask for it to be corrected or deleted, or object to its use, by writing to ${contact}. You also have the right to complain to your data protection authority.
`,
    el: `# Απόρρητο

## Ποιος διαχειρίζεται τη σελίδα

Αυτό είναι ιδιωτικό επαγγελματικό προφίλ. Υπεύθυνος για τα δεδομένα που περιγράφονται εδώ: ${owner.name}.

Επικοινωνία: ${contactEl}

## Τι κάνει η σελίδα

Μπαίνετε με κωδικό πρόσβασης που δόθηκε σε εσάς ή στην εταιρεία σας. Μέσα μπορείτε να δείτε το επαγγελματικό προφίλ και να κάνετε ερωτήσεις στη Donna, μια βοηθό τεχνητής νοημοσύνης που απαντά μόνο για την επαγγελματική πορεία του κατόχου του προφίλ.

Η Donna είναι AI. Οι απαντήσεις της παράγονται αυτόματα από υλικό που έγραψε ο κάτοχος του προφίλ και μπορεί να περιέχουν λάθη. Για οτιδήποτε σημαντικό, επιβεβαιώστε το απευθείας μαζί του.

## Τι αποθηκεύεται

- Ο κωδικός πρόσβασης που χρησιμοποιήσατε και οι ώρες των επισκέψεών σας.
- Η διεύθυνση IP και ο τύπος του browser σας, όταν εισάγετε τον κωδικό.
- Οι ερωτήσεις που γράφετε και οι απαντήσεις της Donna.
- Οι απαντήσεις που επιλέγετε να δώσετε στη φόρμα αξιολόγησης, με όνομα και email μόνο αν τα συμπληρώσετε.
- Ένα cookie που σας κρατά συνδεδεμένους. Είναι απαραίτητο για τη λειτουργία της σελίδας και λήγει μαζί με τον κωδικό σας. Δεν υπάρχουν cookies στατιστικών, διαφήμισης ή παρακολούθησης.

## Γιατί

Η σελίδα υπάρχει για να παρουσιάζεται ένα επαγγελματικό προφίλ σε προσκεκλημένους. Ο κωδικός σας ανοίγει το προφίλ, και οι ερωτήσεις σας υποβάλλονται σε επεξεργασία ώστε να μπορεί η Donna να απαντήσει. Οι συνομιλίες μπορεί να εξετάζονται ώστε το προφίλ και οι απαντήσεις της Donna να παραμένουν ακριβείς και χρήσιμες, ενώ βασικά τεχνικά δεδομένα χρησιμοποιούνται για την ασφάλεια της υπηρεσίας. Η επεξεργασία βασίζεται στο έννομο συμφέρον παρουσίασης της επαγγελματικής πορείας και ασφαλούς λειτουργίας της υπηρεσίας.

## Ποιος άλλος τα επεξεργάζεται

Για να παραχθεί μια απάντηση, το κείμενο της ερώτησής σας στέλνεται στην Anthropic (το μοντέλο AI που γράφει την απάντηση) και στην OpenAI (για να βρεθεί το σχετικό μέρος του προφίλ). Και οι δύο εδρεύουν στις ΗΠΑ. Τίποτα δεν πωλείται ούτε κοινοποιείται για διαφήμιση.

Παρακαλούμε μην γράφετε προσωπικά ή εμπιστευτικά στοιχεία στο chat.

## Για πόσο

Οι επισκέψεις και οι συνομιλίες διατηρούνται όσο είναι χρήσιμες για τους παραπάνω σκοπούς. Διαγράφονται όταν αφαιρεθεί ο κωδικός πρόσβασης στον οποίο ανήκουν, ή νωρίτερα αν το ζητήσετε.

## Τα δικαιώματά σας

Μπορείτε να ζητήσετε αντίγραφο των δεδομένων σας, διόρθωση ή διαγραφή τους, ή να αντιταχθείτε στη χρήση τους, γράφοντας στο: ${contactEl}. Έχετε επίσης δικαίωμα καταγγελίας στην αρμόδια αρχή προστασίας δεδομένων.
`,
  };
}

export async function getPrivacy(): Promise<PrivacyContent> {
  const row = await db.setting.findUnique({ where: { key: "privacy" } });
  const parsed = privacySchema.safeParse(row?.value);
  return parsed.success ? parsed.data : defaultPrivacy(await getOwner());
}

export async function savePrivacy(content: PrivacyContent) {
  await db.setting.upsert({
    where: { key: "privacy" },
    create: { key: "privacy", value: content },
    update: { value: content },
  });
}
