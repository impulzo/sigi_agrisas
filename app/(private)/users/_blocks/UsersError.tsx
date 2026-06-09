interface UsersErrorProps {
  onRetry: () => void;
}

export function UsersError({ onRetry }: UsersErrorProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <p className="text-body-md text-error">No se pudo cargar la lista de usuarios</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-label-lg text-primary underline underline-offset-2"
      >
        Reintentar
      </button>
    </div>
  );
}
