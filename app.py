import xml.etree.ElementTree as ET
import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_html_content(html_str):
    soup = BeautifulSoup(html_str, 'html.parser')
    updates = []
    
    current_type = None
    current_content = []
    
    # We use soup.contents to get top-level elements of the parsed HTML fragment
    for element in soup.contents:
        if element.name == 'h3':
            # Save the previous block if we have one
            if current_type and current_content:
                html_content = ''.join(str(e) for e in current_content)
                text_content = ''.join(e.get_text() if hasattr(e, 'get_text') else str(e) for e in current_content).strip()
                updates.append({
                    'type': current_type,
                    'html': html_content,
                    'text': text_content
                })
            current_type = element.get_text().strip()
            current_content = []
        else:
            if element.name or (isinstance(element, str) and element.strip()):
                current_content.append(element)
                
    # Add the last block
    if current_type and current_content:
        html_content = ''.join(str(e) for e in current_content)
        text_content = ''.join(e.get_text() if hasattr(e, 'get_text') else str(e) for e in current_content).strip()
        updates.append({
            'type': current_type,
            'html': html_content,
            'text': text_content
        })
        
    # Fallback if no <h3> was found (e.g., simple feed entry)
    if not updates and html_str.strip():
        updates.append({
            'type': 'General',
            'html': html_str,
            'text': soup.get_text().strip()
        })
        
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        xml_content = response.content
        
        # Parse the Atom feed
        root = ET.fromstring(xml_content)
        
        # Atom namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title_node = entry.find('atom:title', ns)
            id_node = entry.find('atom:id', ns)
            updated_node = entry.find('atom:updated', ns)
            link_node = entry.find('atom:link[@rel="alternate"]', ns)
            if link_node is None:
                link_node = entry.find('atom:link', ns)
                
            content_node = entry.find('atom:content', ns)
            
            date_str = title_node.text.strip() if title_node is not None else ""
            entry_id = id_node.text.strip() if id_node is not None else ""
            updated_time = updated_node.text.strip() if updated_node is not None else ""
            link_url = link_node.attrib.get('href', '') if link_node is not None else ""
            raw_html = content_node.text if content_node is not None else ""
            
            # Parse the html content of the entry to get separate updates
            parsed_updates = parse_html_content(raw_html)
            
            for update in parsed_updates:
                entries.append({
                    'id': f"{entry_id}#{update['type']}",
                    'date': date_str,
                    'updated_time': updated_time,
                    'link': link_url,
                    'category': update['type'],
                    'html': update['html'],
                    'text': update['text']
                })
                
        return jsonify({
            'status': 'success',
            'count': len(entries),
            'releases': entries
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
