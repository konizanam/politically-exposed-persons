import React, { useRef, useState } from 'react';
import './DisclaimerModal.css';

const DisclaimerModal = ({ onAgree }) => {
  const contentRef = useRef(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const handleScroll = () => {
    const el = contentRef.current;
    if (el) {
      // Check if scrolled to bottom
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
        setScrolledToEnd(true);
      }
    }
  };

  return (
    <div className="disclaimer-modal-backdrop">
      <div className="disclaimer-modal">
        <h2>Legal Disclaimer for Use of the PIP Database</h2>
        <div
          className="disclaimer-content"
          ref={contentRef}
          onScroll={handleScroll}
          tabIndex={0}
          style={{ maxHeight: 350, overflowY: 'auto', textAlign: 'left' }}
        >
          <p><strong>1. Purpose and Compliance Use Only</strong><br />
          This database is developed and provided solely for the purpose of enabling Accountable Institutions to comply with their legal obligations under the Financial Intelligence Act, 2012 (Act No. 13 of 2012), as amended. Specifically, it supports due diligence processes required by Section 23A regarding the identification and monitoring of Prominent Influential Persons (PIPs), their family members, and known close associates.<br />
          Use of the database is strictly limited to regulatory compliance, particularly Anti-Money Laundering (AML), Counter-Terrorism Financing (CTF), and Know Your Customer (KYC) practices.</p>
          <hr />
          <p><strong>2. Accuracy and Source of Information</strong><br />
          The information contained in this database has been sourced from public records, credible media reports, official publications, and other lawfully accessible sources. While reasonable efforts are made to ensure that the data is accurate, current, and complete, no representation or warranty, express or implied, is given as to its authenticity, reliability, or fitness for any particular purpose.<br />
          The classification of individuals as PIPs is based on available information and definitions under the Financial Intelligence Act. However, users must independently assess the risk profile of clients and make final determinations in line with their own institutional policies and regulatory requirements.</p>
          <hr />
          <p><strong>3. Limitation of Liability</strong><br />
          The service provider shall not be held liable for any loss, damage, or regulatory consequences arising from:<br />
          • The absence of a relevant individual in the database despite qualifying as a PIP;<br />
          • The inclusion of a person based on outdated or misinterpreted information;<br />
          • The misuse or misinterpretation of the data by the end user; or<br />
          • Any reliance placed on the data without independent verification.<br />
          Users are advised to treat the database as a decision-support tool and not as a substitute for independent due diligence, professional judgment, or legal consultation.</p>
          <hr />
          <p><strong>4. Amendments and Complaints</strong><br />
          Any data subject who believes that their information is inaccurately presented or wrongly included in the database may submit a request for review, correction, or removal. Verified and valid claims will be addressed in line with applicable legal and ethical standards.</p>
        </div>
        <button
          className="agree-btn"
          onClick={onAgree}
          disabled={!scrolledToEnd}
          style={{ opacity: scrolledToEnd ? 1 : 0.5, cursor: scrolledToEnd ? 'pointer' : 'not-allowed' }}
        >
          I Agree
        </button>
        {!scrolledToEnd && (
          <div style={{ textAlign: 'center', color: '#888', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            Please scroll to the end to enable the Agree button.
          </div>
        )}
      </div>
    </div>
  );
};

export default DisclaimerModal;