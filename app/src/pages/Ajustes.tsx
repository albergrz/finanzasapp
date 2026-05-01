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
  const [barbNames, setBarbNames] = useState<Record<string, string>>({});
  const [newSvc, setNewSvc] = useState({ name: '', price: '' });
  const [newBarb, setNewBarb] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sp: Record<string, string> = {};
    services.forEach((s) => { sp[s.id] = String(s.price); });
    setSvcPrices(sp);
    const bn: Record<string, string> = {};
    barbers.forEach((b) => { bn[b.id] = b.name; });
    setBarbNames(bn);
  }, [services, barbers]);

  const isJefe = profile?.role === 'jefe';

  async function saveAll() {
    setSaving(true);
    const ops: Promise<unknown>[] = [];
    services.forEach((s) => {
      const p = parseFloat(svcPrices[s.id] ?? String(s.price));
      if (isNaN(p) || p < 0 || p === Number(s.price)) return;
      ops.push(Promise.resolve(supabase.from('services').update({ price: p }).eq('id', s.id)));
    });
    barbers.forEach((b) => {
      const n = (barbNames[b.id] ?? b.name).trim();
      if (!n || n === b.name) return;
      ops.push(Promise.resolve(supabase.from('barbers').update({ name: n }).eq('id', b.id)));
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

  async function addBarber() {
    if (!newBarb.trim()) return show('Nombre vacío');
    const { error } = await supabase.from('barbers').insert({
      name: newBarb.trim(),
      display_order: barbers.length,
    });
    if (error) return show(error.message);
    show('Peluquero añadido ✓');
    setNewBarb('');
    refresh();
  }

  async function removeBarber(id: string) {
    if (!confirm('¿Eliminar este peluquero?')) return;
    const { error } = await supabase.from('barbers').update({ active: false }).eq('id', id);
    if (error) return show(error.message);
    show('Peluquero eliminado');
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
              <div key={s.id} className="settings-row">
                <div className="settings-row-label">{s.name}</div>
                <input
                  type="number"
                  className="settings-row-input"
                  value={svcPrices[s.id] ?? ''}
                  onChange={(e) => setSvcPrices({ ...svcPrices, [s.id]: e.target.value })}
                  min="0"
                  step="0.5"
                />
                <button className="abtn cancel-btn" onClick={() => removeService(s.id)} aria-label="Eliminar">×</button>
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
              <div key={b.id} className="settings-row">
                <input
                  type="text"
                  className="settings-row-input barber-input"
                  value={barbNames[b.id] ?? ''}
                  onChange={(e) => setBarbNames({ ...barbNames, [b.id]: e.target.value })}
                  style={{ flex: 1 }}
                />
                <button className="abtn cancel-btn" onClick={() => removeBarber(b.id)} aria-label="Eliminar">×</button>
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
