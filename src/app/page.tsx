import { Orb } from "./Orb";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <a className="logo" href="/">
            <span className="logo-dot" aria-hidden="true" />
            immada
          </a>
          <nav className="nav-links" aria-label="Hauptnavigation">
            <a href="#erinnerungen">Erinnerungen</a>
            <a href="#ablauf">Wie es wirkt</a>
            <a href="#schale">Die Schale</a>
            <a href="#ewigkeit">Für die Ewigkeit</a>
          </nav>
          <a className="btn-primary btn-pill nav-cta" href="#kontakt">
            Kugel sichern
          </a>
        </div>
      </header>

      <main className="lp">
        {/* HERO */}
        <section className="hero">
          <div className="container hero-inner">
            <div className="hero-orb">
              <Orb size={210} cradle />
            </div>
            <p className="eyebrow">immada · immer für dich da</p>
            <h1 className="hero-title">
              Worte, die bleiben.
              <br />
              Stimmen, die niemals verklingen.
            </h1>
            <p className="hero-sub">
              Eine Erinnerungskugel bewahrt deine Stimme, dein Lachen, deine
              liebsten Worte – und gibt sie dir zurück, sooft dein Herz sie
              ruft. Ein Augenblick, gebannt in Licht, für die Ewigkeit.
            </p>
            <div className="hero-cta">
              <a className="btn-primary btn-lg" href="#kontakt">
                Erinnerungskugel sichern
              </a>
              <a className="btn-ghost btn-lg" href="#ablauf">
                So funktioniert&rsquo;s
              </a>
            </div>
            <p className="hero-note">
              Keine App nötig · 120 Sekunden Stimme · für immer besiegelt
            </p>
          </div>
        </section>

        {/* ERINNERUNGSBEISPIELE */}
        <section className="band" id="erinnerungen">
          <div className="container">
            <p className="eyebrow center">Augenblicke fürs Leben</p>
            <h2 className="section-h center">
              Welche Erinnerung möchtest du bewahren?
            </h2>
            <p className="section-intro center">
              Manche Klänge tragen ein ganzes Gefühl in sich. Genau diese
              schenkst du einer Kugel.
            </p>
            <div className="examples">
              <article className="example">
                <span className="example-ic" aria-hidden="true">
                  👶
                </span>
                <h3>Das erste „Mama“</h3>
                <p>
                  Der zarte Moment, in dem dein Kind zum ersten Mal nach dir
                  ruft.
                </p>
              </article>
              <article className="example">
                <span className="example-ic" aria-hidden="true">
                  🔔
                </span>
                <h3>Eure Hochzeitsglocken</h3>
                <p>Der Klang des Ja-Worts, der über den Platz hallt.</p>
              </article>
              <article className="example">
                <span className="example-ic" aria-hidden="true">
                  🌲
                </span>
                <h3>Das Rauschen im Wald</h3>
                <p>
                  Das sanfte Wispern der Blätter an einem stillen Nachmittag.
                </p>
              </article>
              <article className="example">
                <span className="example-ic" aria-hidden="true">
                  🎶
                </span>
                <h3>Großmutters Lied</h3>
                <p>Die Melodie, die sie immer summte, wenn sie glücklich war.</p>
              </article>
              <article className="example">
                <span className="example-ic" aria-hidden="true">
                  💬
                </span>
                <h3>Ein „Ich liebe dich“</h3>
                <p>Worte einer vertrauten Stimme, die niemals verklingen.</p>
              </article>
              <article className="example">
                <span className="example-ic" aria-hidden="true">
                  🌊
                </span>
                <h3>Wellen am Lieblingsstrand</h3>
                <p>Das Meer eures schönsten Sommers, eingefangen für immer.</p>
              </article>
            </div>
          </div>
        </section>

        {/* ABLAUF */}
        <section className="band band-soft" id="ablauf">
          <div className="container">
            <p className="eyebrow center">In drei Schritten</p>
            <h2 className="section-h center">So erwacht deine Kugel</h2>
            <div className="grid-3">
              <article className="feature">
                <span className="step-num">1</span>
                <h3>Berühren &amp; erwecken</h3>
                <p>
                  Halte dein Smartphone sanft an die Kugel oder folge dem
                  Zeichen, das in sie eingelassen ist. Ihr Licht erwacht und
                  führt dich zu ihrer Seele.
                </p>
              </article>
              <article className="feature">
                <span className="step-num">2</span>
                <h3>Botschaft anvertrauen</h3>
                <p>
                  Sprich aus, was bewahrt werden soll – bis zu zwei Minuten.
                  Lausche, verwirf, sprich aufs Neue, solange dein Herz nach den
                  rechten Worten sucht.
                </p>
              </article>
              <article className="feature">
                <span className="step-num">3</span>
                <h3>Besiegeln &amp; lauschen</h3>
                <p>
                  Mit dem Besiegeln gehört die Botschaft für immer der Kugel.
                  Eine Berührung genügt – und ihre Stimme erklingt aufs Neue,
                  wann immer du ihrer bedarfst.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* SCHALE */}
        <section className="band" id="schale">
          <div className="container split">
            <div className="split-visual">
              <Orb size={180} cradle />
            </div>
            <div className="split-text">
              <p className="eyebrow">Der Ort des Lauschens</p>
              <h2 className="section-h">Die Schale</h2>
              <p className="lead">
                Bette deine Kugel in ihre Schale – und ihre Stimme erklingt von
                selbst. Ein stiller Begleiter für den Nachttisch, das Regal, den
                Platz, an dem die Erinnerung zu Hause ist.
              </p>
              <ul className="ticks">
                <li>Erkennt deine Kugel berührungslos und erweckt sie</li>
                <li>Klare, warme Wiedergabe – ganz ohne Smartphone</li>
                <li>Ebenso erreichbar über das eingelassene Zeichen (QR)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* EWIGKEIT / FEATURES */}
        <section className="band" id="ewigkeit">
          <div className="container">
            <p className="eyebrow center">Ein Versprechen</p>
            <h2 className="section-h center">
              Einmal besiegelt, für die Ewigkeit
            </h2>
            <div className="grid-4">
              <article className="mini">
                <div className="mini-ic" aria-hidden="true">
                  ✦
                </div>
                <h3>Unveränderlich</h3>
                <p>
                  Eine besiegelte Botschaft kann nie wieder verändert oder
                  überschrieben werden.
                </p>
              </article>
              <article className="mini">
                <div className="mini-ic" aria-hidden="true">
                  ◷
                </div>
                <h3>Bis zu 120 Sekunden</h3>
                <p>
                  Genug Raum für die Worte, die wirklich zählen – ohne
                  Ablenkung.
                </p>
              </article>
              <article className="mini">
                <div className="mini-ic" aria-hidden="true">
                  ◎
                </div>
                <h3>QR &amp; Schale</h3>
                <p>
                  Erreichbar am Smartphone und an der Schale – wie es dir gefällt.
                </p>
              </article>
              <article className="mini">
                <div className="mini-ic" aria-hidden="true">
                  ⛬
                </div>
                <h3>Sicher verwahrt</h3>
                <p>
                  Deine Aufnahme ruht verschlüsselt und geschützt – ganz allein
                  für dich.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ABSCHLUSS-CTA */}
        <section className="cta-band" id="kontakt">
          <div className="container center">
            <h2 className="cta-title">Bewahre, was zählt.</h2>
            <p className="cta-sub">
              Schenke einer Stimme ein Zuhause – heute, für alle Zeit.
            </p>
            <a className="btn-light btn-lg" href="mailto:hallo@treasure.at">
              Jetzt Erinnerungskugel anfragen
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <div className="logo">
              <span className="logo-dot" aria-hidden="true" />
              immada
            </div>
            <p>
              Erinnerungskugeln für die Augenblicke, die bleiben sollen.
            </p>
          </div>
          <div className="footer-col">
            <h4>Entdecken</h4>
            <a href="#erinnerungen">Erinnerungen</a>
            <a href="#ablauf">Wie es wirkt</a>
            <a href="#schale">Die Schale</a>
            <a href="#ewigkeit">Für die Ewigkeit</a>
          </div>
          <div className="footer-col">
            <h4>Rechtliches</h4>
            <a href="#">Datenschutz</a>
            <a href="#">Impressum</a>
            <a href="#">AGB</a>
          </div>
          <div className="footer-col">
            <h4>Kontakt</h4>
            <a href="mailto:hallo@treasure.at">hallo@treasure.at</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 immada · Memory Orbs</span>
          <span>Mit Sorgfalt gemacht ✦</span>
        </div>
      </footer>
    </>
  );
}
