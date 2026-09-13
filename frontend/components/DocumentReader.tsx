'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

/**
 * Lector de documents (passaport/DNI) per carregar les dades del client soles.
 *
 * - "Enganxa el MRZ": per a lectors físics USB (keyboard wedge) que escriuen el
 *   text MRZ directament, o per enganxar-lo a mà.
 * - "Foto del document": OCR (Tesseract) que reconeix la zona MRZ de la imatge.
 *
 * En reconèixer les dades crida `onParsed(fields)` amb els camps del Guest
 * (first_name, last_name, document_number, birth_date, nationality, sex, ...).
 */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('No s\'ha pogut llegir el fitxer'));
    r.readAsDataURL(file);
  });
}

export default function DocumentReader({ onParsed }: { onParsed: (fields: any) => void }) {
  const [mrz, setMrz] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'mrz' | 'ocr'>('mrz');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const apply = (guestFields: any) => {
    setFeedback({ ok: true, text: `Dades llegides: ${guestFields.first_name} ${guestFields.last_name}` });
    onParsed(guestFields);
  };

  const parseText = async () => {
    if (!mrz.trim()) return;
    setLoading(true);
    setFeedback(null);
    try {
      const r = await api.guests.parseMrz(mrz);
      apply(r.guest_fields);
    } catch (e: any) {
      setFeedback({ ok: false, text: e?.detail || e?.message || 'Error parsejant el MRZ' });
    } finally {
      setLoading(false);
    }
  };

  const handleImage = async (file: File) => {
    setLoading(true);
    setFeedback(null);
    try {
      const base64 = await fileToBase64(file);
      const r = await api.guests.ocr(base64);
      apply(r.guest_fields);
    } catch (e: any) {
      setFeedback({ ok: false, text: e?.detail || e?.message || 'Error reconeixent el document' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">📷 Llegir document (passaport / DNI)</span>
        <div className="flex gap-1">
          <button
            onClick={() => setMode('mrz')}
            className={`px-3 py-1 text-xs rounded ${mode === 'mrz' ? 'bg-[#e2b04a] text-[#1a1a2e] font-semibold' : 'bg-slate-700 text-slate-300'}`}
          >
            Text MRZ
          </button>
          <button
            onClick={() => setMode('ocr')}
            className={`px-3 py-1 text-xs rounded ${mode === 'ocr' ? 'bg-[#e2b04a] text-[#1a1a2e] font-semibold' : 'bg-slate-700 text-slate-300'}`}
          >
            Foto (OCR)
          </button>
        </div>
      </div>

      {mode === 'mrz' ? (
        <div className="space-y-2">
          <textarea
            value={mrz}
            onChange={(e) => setMrz(e.target.value)}
            rows={3}
            placeholder={"Enganxa aquí les línies MRZ (les que acaben en <<<<<)...\nEx: P<ESPGARCIA<<MARIA<<<<<<<<<<<<<<<<<<<"}
            className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white text-xs font-mono"
          />
          <button
            onClick={parseText}
            disabled={loading || !mrz.trim()}
            className="px-4 py-2 bg-[#e2b04a] text-[#1a1a2e] rounded font-medium hover:bg-[#d4a03a] disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? 'Llegint...' : 'Llegir MRZ'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block">
            <span className="text-xs text-slate-400">
              Fes una foto nítida del document (amb la zona inferior dels &quot;&lt;&lt;&lt;&quot; visible) o puja-la:
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
              className="mt-2 block w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#e2b04a] file:text-[#1a1a2e] file:font-semibold hover:file:bg-[#d4a03a]"
            />
          </label>
          {loading && <p className="text-xs text-slate-400">Reconeixent el document...</p>}
        </div>
      )}

      {feedback && (
        <p className={`text-xs ${feedback.ok ? 'text-green-400' : 'text-red-400'}`}>{feedback.text}</p>
      )}
    </div>
  );
}
