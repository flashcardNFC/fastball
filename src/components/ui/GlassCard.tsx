

const styles = {
    glassCard: {
        padding: '12px 24px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '110px',
        position: 'relative' as const,
        overflow: 'hidden',
    },
    cardLabel: {
        fontSize: '10px',
        fontWeight: 900,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.2em',
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: '4px',
    },
    cardValue: {
        fontSize: 'clamp(18px, 4vw, 32px)',
        fontWeight: 900,
        fontStyle: 'italic',
        lineHeight: 1,
    }
};

export const GlassCardUI = ({ label, value, children, style = {} }: any) => (
    <div style={{ ...styles.glassCard, ...style }}>
        <div style={styles.cardLabel as any}>{label}</div>
        {value !== undefined ? <div style={styles.cardValue as any}>{value}</div> : children}
    </div>
);
