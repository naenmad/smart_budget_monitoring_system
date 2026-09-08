import { useState } from 'react';
import s from './Tabs.module.css';

export default function Tabs({ tabs, defaultTabId }) {
  const [activeTab, setActiveTab] = useState(defaultTabId || (tabs.length > 0 ? tabs[0].id : null));

  return (
    <div className={s.tabsContainer}>
      <div className={s.tabList}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`${s.tabButton} ${activeTab === tab.id ? s.active : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {Icon && <Icon size={16} />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className={s.tabContent}>
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}
