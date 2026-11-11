import SkeletonCard from '../../components/SkeletonCard';

export default function InvestmentsSkeleton() {
  return (
    <>
      <SkeletonCard height={44} style={{ borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-5)', maxWidth: 300 }} />
      <div className="stat-grid">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} height={150} style={{ borderRadius: 'var(--r-lg)' }} />)}
      </div>
      <div className="ui-grid ui-grid--sidebar" style={{ marginTop: 'var(--sp-4)' }}>
        <SkeletonCard height={340} style={{ borderRadius: 'var(--r-lg)' }} />
        <SkeletonCard height={340} style={{ borderRadius: 'var(--r-lg)' }} />
      </div>
    </>
  );
}
