// The owner's own edits to a running bee, without the Beekeeper: new rules (and coins), and a new portrait.
// Rules go in the way a Beekeeper rewrite does (POST /keeper/rules): live on the bee's next tick, listed on the
// Beekeeper card, and undone from there. Every write carries the owner password, like the Hive's and the Beekeeper's.
import { useState, type FormEvent } from "react";
import { portraitJpeg } from "./portrait";
import { BEE_META, type BeeName } from "./types";

async function ownerPost(path: string, password: string, body: unknown): Promise<void> {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json", "x-owner-password": encodeURIComponent(password) }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as { error?: string };
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
}

export function BeeEdit({ name, onClose }: { name: BeeName; onClose: () => void }) {
  const meta = BEE_META[name];
  const [rules, setRules] = useState(meta.rules);
  const [coins, setCoins] = useState(meta.coins.join(", "));
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const rulesChanged = rules.trim() !== meta.rules.trim() || coins.trim() !== meta.coins.join(", ");
  const ready = password.length >= 8 && !busy && (file !== null || (rulesChanged && rules.trim().length >= 10));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError("");
    try {
      if (file) await ownerPost("/keeper/portrait", password, { bee: name, jpeg: await portraitJpeg(file) });
      if (rulesChanged) {
        const list = coins.split(/[\s,;]+/).map((c) => c.trim().toUpperCase()).filter(Boolean);
        await ownerPost("/keeper/rules", password, { bee: name, rules: rules.trim(), coins: list });
      }
      // The names, rules and pictures come from /profile, read once when the page loads.
      location.reload();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form className="bee-edit" onSubmit={save}>
      <label className="keeper-label" htmlFor={`rules-${name}`}>
        Rules for {meta.short}
      </label>
      <textarea id={`rules-${name}`} className="keeper-input" rows={4} maxLength={500} value={rules} placeholder="Its rules in plain English (10-500 characters)" onChange={(e) => setRules(e.target.value)} />
      <input className="keeper-input" placeholder="Coins, e.g. BTC, ETH (empty = all it may trade)" aria-label="Coins" value={coins} onChange={(e) => setCoins(e.target.value)} />
      <p className="bee-edit-hint dim">Live on its next tick. Coins can only narrow what its brain (and its Setup coin list, if it has one) allows. Undo it on the Beekeeper card.</p>
      <label className="keeper-label" htmlFor={`pic-${name}`}>
        New picture (optional)
      </label>
      <input id={`pic-${name}`} className="keeper-input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <div className="keeper-form-row">
        <input className="keeper-input" type="password" autoComplete="current-password" placeholder="Owner password" aria-label="Owner password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="keeper-go" disabled={!ready}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" className="keeper-link" onClick={onClose}>
          Cancel
        </button>
      </div>
      {error && <p className="keeper-error bad">{error}</p>}
    </form>
  );
}
