import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCatalog } from '../hooks/useCatalog';
import { useAuth } from '../lib/auth';
import { useToast } from '../hooks/useToast';

export function Ajustes() {
  const { barbers, services, refresh } = useCatalog();
  const { profile, signOut } = useAuth();
  const { show } = useToast();

  const [svcPrices, setSvcPrices] = useState<Record<string, string>>({});
  const [svcDurations, setSvcDurations] = useState<Record<string, string>>({});
  const [svcDescs, setSvcDescs] = useState<Record<string, string>>({});
  const [barbNames, setBarbNames] = useState<Record<string, string>>({});
  const [barbRoles, setBarbRoles] = useState<Record<string, string>>({});
  const [barbBios, setBarbBios] = useState<Record<string, string>>({});
  const [barbHues, setBarbHues] = useState<Record<string, string>>({});
  const [newSvc, setNewSvc] = useState({ name: '', price: '' });
  const [newBarb, setNewBarb] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sp: Record<string, string> = {};
    const sd: Record<string, string> = {};
    const sde: Record<string, string> = {};
    services.forEach((s) => {
      sp[s.id] = String(s.price);
      sd[s.id] = String(s.duration_minutes ?? 30);
      sde[s.id] = s.description ?? '';
    });
    setSvcPrices(sp); setSvcDurations(sd); setSvcDescs(sde);

    const bn: Record<string, string> = {};
    const br: Record<string, string> = {};
    const bb: Record<string, string> = {};
    const bh: Record<string, string> = {};
    barbers.forEach((b) => {
      bn[b.id] = b.name;
      br[b.id] = b.role ?? '';
      bb[b.id] = b.bio ?? '';
      bh[b.id] = String(b.hue ?? 75);
    });
    setBarbNames(bn); setBarbRoles(br); setBarbBios(bb); setBarbHues(bh);
  }, [services, barbers]);

  const isJefe = profile?.role === 'jefe';

  async function saveAll() {
    setSaving(true);
    const ops: Promise<unknown>[] = [];
    services.forEach((s) => {
      const patch: Record<string, unknown> = {};
      const p = parseFloat(svcPrices[s.id] ?? String(s.price));
      if (!isNaN(p) && p >= 0 && p !== Number(s.price)) patch.price = p;
      const d = parseInt(svcDurations[s.id] ?? String(s.duration_minutes ?? 30), 10);
      if (!isNaN(d) && d > 0 && d !== (s.duration_minutes ?? 30)) patch.duration_minutes = d;
      const desc = (svcDescs[s.id] ?? '').trim();
      if (desc !== (s.description ?? '')) patch.description = desc;
      if (Object.keys(patch).length) {
        ops.push(Promise.resolve(supabase.from('services').update(patch).eq('id', s.id)));
      }
    });
    barbers.forEach((b) => {
      const patch: Record<string, unknown> = {};
      const n = (barbNames[b.id] ?? b.name).trim();
      if (n && n !== b.name) patch.name = n;
      const r = (barbRoles[b.id] ?? '').trim();
      if (r !== (b.role ?? '')) patch.role = r;
      const bio = (barbBios[b.id] ?? '').trim();
      if (bio !== (b.bio ?? '')) patch.bio = bio;
      const h = parseInt(barbHues[b.id] ?? String(b.hue ?? 75), 10);
      if (!isNaN(h) && h >= 0 && h <= 360 && h !== (b.hue ?? 75)) patch.hue = h;
      if (Object.keys(patch).length) {
        ops.push(Promise.resolve(supabase.from('barbers').update(patch).eq('id', b.id)));
      }
    });
    await Promise.all(ops);
    setSaving(false);
    show('Cambios guardados ✓');
    refresh();
  }

  async function addService() {
    const price = parseFloat(newSvc.price);
    if (!newSvc.name.trim() || isNaN(price) || price < 0) return show('Datos inválidos');
    const { error } = await supabase.from('services').insert({
      name: newSvc.name.trim(),
      price,
      display_order: services.length,
    });
    if (error) return show(error.message);
    show('Servicio añadido ✓');
    setNewSvc({ name: '', price: '' });
    refresh();
  }

  async function removeService(id: string) {
    if (!confirm('¿Eliminar este servicio?')) return;
    const { error } = await supabase.from('services').update({ active: false }).eq('id', id);
    if (error) return show(error.message);
    show('Servicio eliminado');
    refresh();
  }

  // Solo hay 3 slots fijos de calendario (SLOT_1/2/3) — añadir significa
  // reutilizar un slot libre. Si los 3 están ocupados, no se puede añadir
  // hasta que se elimine uno.
  async function addBarber() {
    if (!newBarb.trim()) return show('Nombre vacío');
    const SLOTS = ['SLOT_1', 'SLOT_2', 'SLOT_3'];
    const used = new Set(barbers.map((b) => b.slot_key).filter(Boolean));
    const free = SLOTS.find((s) => !used.has(s));
    if (!free) return show('Ya hay 3 peluqueros. Elimina uno antes.');
    const { error } = await supabase.from('barbers').insert({
      name: newBarb.trim(),
      display_order: barbers.length,
      slot_key: free,
    });
    if (error) return show(error.message);
    show(`Peluquero añadido ✓ (${free})`);
    setNewBarb('');
    refresh();
  }

  // Al eliminar liberamos su slot_key (para que el próximo barbero pueda
  // reutilizarlo). Mantenemos el registro con active=false por trazabilidad.
  async function removeBarber(id: string) {
    if (!confirm('¿Eliminar este peluquero? Se liberará su slot de calendario.')) return;
    const { error } = await supabase
      .from('barbers')
      .update({ active: false, slot_key: null })
      .eq('id', id);
    if (error) return show(error.message);
    show('Peluquero eliminado · slot liberado');
    refresh();
  }

  return (
    <div className="page">
      <div className="settings-section">
        <div className="settings-section-title">Cuenta</div>
        <div className="settings-row">
          <div className="settings-row-label">{profile?.display_name ?? profile?.email}</div>
          <span className="abadge done" style={{ textTransform: 'uppercase' }}>{profile?.role ?? '—'}</span>
        </div>
      </div>

      {!isJefe && (
        <div className="settings-section">
          <div className="settings-section-title">Modo caja</div>
          <div className="settings-row">
            <div className="settings-row-label">Los ajustes de servicios, peluqueros y precios están reservados para jefe.</div>
          </div>
        </div>
      )}

      {isJefe && (
        <>
          <div className="settings-section">
            <div className="settings-section-title">Servicios</div>
            {services.map((s) => (
              <div key={s.id} style={{ borderBottom: '1px solid var(--border, #2a2a2a)', paddingBottom: 8, marginBottom: 8 }}>
                <div className="settings-row">
                  <div className="settings-row-label" style={{ flex: 1 }}>{s.name}</div>
                  <input
                    type="number"
                    className="settings-row-input"
                    title="Precio €"
                    value={svcPrices[s.id] ?? ''}
                    onChange={(e) => setSvcPrices({ ...svcPrices, [s.id]: e.target.value })}
                    min="0"
                    step="0.5"
                    style={{ width: 70 }}
                  />
                  <input
                    type="number"
                    className="settings-row-input"
                    title="Duración en minutos"
                    value={svcDurations[s.id] ?? ''}
                    onChange={(e) => setSvcDurations({ ...svcDurations, [s.id]: e.target.value })}
                    min="5"
                    step="5"
                    style={{ width: 60 }}
                    placeholder="min"
                  />
                  <button className="abtn cancel-btn" onClick={() => removeService(s.id)} aria-label="Eliminar">×</button>
                </div>
                <input
                  type="text"
                  className="settings-row-input"
                  placeholder="Descripción (visible en la web)"
                  value={svcDescs[s.id] ?? ''}
                  onChange={(e) => setSvcDescs({ ...svcDescs, [s.id]: e.target.value })}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>
            ))}
            <div className="settings-row">
              <input
                type="text"
                className="settings-row-input barber-input"
                placeholder="Nuevo servicio"
                value={newSvc.name}
                onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })}
                style={{ flex: 1, textAlign: 'left', width: 'auto' }}
              />
              <input
                type="number"
                className="settings-row-input"
                placeholder="€"
                value={newSvc.price}
                onChange={(e) => setNewSvc({ ...newSvc, price: e.target.value })}
                min="0"
                step="0.5"
              />
              <button className="abtn" onClick={addService}>+</button>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Peluqueros</div>
            {barbers.map((b) => (
              <div key={b.id} style={{ borderBottom: '1px solid var(--border, #2a2a2a)', paddingBottom: 8, marginBottom: 8 }}>
                <div className="settings-row">
                  <span style={{ fontSize: 11, opacity: 0.55, marginRight: 8 }}>{b.slot_key ?? '—'}</span>
                  <input
                    type="text"
                    className="settings-row-input barber-input"
                    value={barbNames[b.id] ?? ''}
                    onChange={(e) => setBarbNames({ ...barbNames, [b.id]: e.target.value })}
                    style={{ flex: 1 }}
                    placeholder="Nombre"
                  />
                  <input
                    type="number"
                    className="settings-row-input"
                    title="Color avatar (0-360)"
                    value={barbHues[b.id] ?? ''}
                    onChange={(e) => setBarbHues({ ...barbHues, [b.id]: e.target.value })}
                    min="0"
                    max="360"
                    step="5"
                    style={{ width: 60 }}
                    placeholder="hue"
                  />
                  <button className="abtn cancel-btn" onClick={() => removeBarber(b.id)} aria-label="Eliminar">×</button>
                </div>
                <input
                  type="text"
                  className="settings-row-input"
                  placeholder="Rol (ej. Master Barber)"
                  value={barbRoles[b.id] ?? ''}
                  onChange={(e) => setBarbRoles({ ...barbRoles, [b.id]: e.target.value })}
                  style={{ width: '100%', marginTop: 4 }}
                />
                <input
                  type="text"
                  className="settings-row-input"
                  placeholder="Bio corta (visible en la web)"
                  value={barbBios[b.id] ?? ''}
                  onChange={(e) => setBarbBios({ ...barbBios, [b.id]: e.target.value })}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>
            ))}
            <div className="settings-row">
              <input
                type="text"
                className="settings-row-input barber-input"
                placeholder="Nuevo peluquero"
                value={newBarb}
                onChange={(e) => setNewBarb(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="abtn" onClick={addBarber}>+</button>
            </div>
          </div>

          <div className="settings-section chief-zone">
            <div className="settings-section-title">Zona jefe</div>
            <div className="settings-row">
              <div className="settings-row-label">Guardar precios y nombres visibles en caja</div>
            </div>
            <button className="btn-save" onClick={saveAll} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </>
      )}

      <button className="btn-danger" onClick={signOut}>Cerrar sesión</button>
    </div>
  );
}
