import SkeletonCard from '../../components/SkeletonCard';

/* Espelha a estrutura real do dashboard, para o salto ao carregar ser mínimo. */
export default function DashboardSkeleton() {
  return (
    <>
      <SkeletonCard height={44} style={{ borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-5)', maxWidth: 300 }} />
      <div className="stat-grid">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} height={150} style={{ borderRadius: 'var(--r-lg)' }} />)}
      </div>
      <SkeletonCard height={40} style={{ borderRadius: 'var(--r-md)', margin: 'var(--sp-5) 0 var(--sp-4)', maxWidth: 360 }} />
      <div className="finance-grid">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} height={280} style={{ borderRadius: 'var(--r-lg)' }} />)}
      </div>
      <SkeletonCard height={320} style={{ borderRadius: 'var(--r-lg)', marginTop: 'var(--sp-4)' }} />
    </>
  );
}
