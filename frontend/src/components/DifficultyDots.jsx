export default function DifficultyDots({ level }) {
  return (
    <div className="flex gap-1 items-center" title={`רמת קושי: ${level}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i < level ? 'bg-gray-700' : 'bg-gray-300'}`}
        />
      ))}
    </div>
  )
}
