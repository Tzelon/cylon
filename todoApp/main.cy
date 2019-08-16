import dom
import html

def view: ƒ {
    return html!(
        <div>
        <header className="header">
          <h1>todos</h1>
          <input
           @click=${() => }
          />
        </header>
      </div>
    )
}

def main: ƒ {
    dom.render(

        '.element'
    )
}