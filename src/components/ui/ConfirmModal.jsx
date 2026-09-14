import React from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { haptics } from '../../lib/motion';

const typeConfig = {
  warning: { Icon: AlertTriangle, tone: 'text-caution', bg: 'bg-caution/14', variant: 'primary' },
  danger: { Icon: Trash2, tone: 'text-critical', bg: 'bg-critical/14', variant: 'destructive' },
  info: { Icon: Info, tone: 'text-accent', bg: 'bg-accent/14', variant: 'primary' },
  success: { Icon: CheckCircle2, tone: 'text-positive', bg: 'bg-positive/14', variant: 'primary' },
};

/**
 * Confirmación.
 *
 * Se reserva para lo genuinamente destructivo e irreversible. Pedir
 * confirmación por todo enseña a la gente a aceptar sin leer, y entonces deja
 * de proteger de nada. Para lo reversible, mejor actuar y ofrecer deshacer.
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar acción',
  message = '¿Seguro que quieres continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  loading = false,
}) => {
  const { Icon, tone, bg, variant } = typeConfig[type] || typeConfig.warning;

  const handleConfirm = () => {
    // El háptico cae en el evento causal — la acción confirmándose — no al
    // final de una animación.
    if (type === 'danger') haptics.error();
    else haptics.success();
    onConfirm?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="max-w-sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="sm:min-w-[7rem]">
            {cancelText}
          </Button>
          <Button variant={variant} onClick={handleConfirm} loading={loading} className="sm:min-w-[7rem]">
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 pt-2 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${bg} ${tone}`}>
          <Icon size={22} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h2 className="text-headline font-semibold text-label">{title}</h2>
          <p className="mt-1.5 text-subhead leading-relaxed text-label-secondary">{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
