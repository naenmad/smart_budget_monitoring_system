import styles from './TableSkeleton.module.css'

export default function TableSkeleton({ rows = 6, columns = 7 }) {
  const colArray = Array.isArray(columns)
    ? columns
    : Array.from({ length: columns }, (_, i) => {
        if (i === 0) return '40px'
        if (i === 1) return '110px'
        if (i === 2) return '240px'
        return '120px'
      })

  return (
    <div className={styles.skeletonWrapper}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            {colArray.map((width, idx) => (
              <th key={idx} className={styles.th} style={{ width }}>
                <div className={`${styles.bone} ${styles.boneHeader}`} style={{ width: '70%' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx} className={styles.row}>
              {colArray.map((width, cIdx) => (
                <td key={cIdx} className={styles.td}>
                  <div
                    className={styles.bone}
                    style={{
                      width: cIdx === 0 ? '60%' : cIdx === 2 ? '90%' : '75%',
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
